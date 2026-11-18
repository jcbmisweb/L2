import {
  CharacterRecord,
  ClanRecord,
  EquipmentSlot,
  ImportMergeMode,
  ItemEntry,
  ItemLocation,
  L2Database,
  ParseImportResult,
  ParsedPayloadPreview,
  RawCapturePayload,
  SubclassInfo,
} from '../types/l2';
import {deduplicateItemEntries} from './mergeDatabase';
import {resolveItemNameWithGrade} from './storage';

const VALID_LOCATIONS = new Set<ItemLocation>([
  'equipped',
  'inventory',
  'warehouse',
  'mail',
  'pets',
  'quests',
  'clan_warehouse',
]);

const VALID_SLOTS = new Set<EquipmentSlot>([
  'hair_1',
  'helmet',
  'hair_2',
  'gloves',
  'chest',
  'boots',
  'cloak',
  'legs',
  'belt',
  'rhand',
  'lhand',
  'earring_1',
  'earring_2',
  'shirt',
  'ring_1',
  'ring_2',
  'necklace',
]);

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeCharacterId(server: string, account: string, name: string): string {
  return `${server.trim()}::${account.trim()}::${name.trim()}`;
}

export function makeClanId(server: string, clanName: string): string {
  return `${server.trim()}::${clanName.trim()}`;
}

export function makeAccountId(server: string, account: string): string {
  return `${server.trim()}::${account.trim()}`;
}

function stripMarkdownFences(raw: string): string {
  let cleaned = raw.trim();
  // Remove ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return cleaned;
}

function splitMultipleJsonInputs(cleaned: string): unknown[] {
  // Try standard single JSON parse first (object or array)
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Support concatenated JSON objects separated by whitespace/newlines
    const results: unknown[] = [];
    let depth = 0;
    let inString = false;
    let escape = false;
    let start = -1;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          const slice = cleaned.slice(start, i + 1);
          results.push(JSON.parse(slice));
          start = -1;
        }
      }
    }

    if (results.length > 0 && depth === 0) {
      return results;
    }
    throw new Error('JSON inválido. Revisa comillas, llaves o comas sobrantes.');
  }
}

function parseQuantity(val: unknown): {quantity: number | null; coerced: boolean} {
  if (val === null || val === undefined || val === '') {
    return {quantity: null, coerced: false};
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return {quantity: null, coerced: false};
    return {quantity: Math.round(val), coerced: false};
  }
  if (typeof val === 'string') {
    const digitsOnly = val.replace(/\./g, '').replace(/,/g, '').trim();
    if (/^\d+$/.test(digitsOnly)) {
      return {quantity: Number(digitsOnly), coerced: true};
    }
  }
  return {quantity: null, coerced: false};
}

function parseNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    const cleaned = val.replace(/\./g, '').replace(',', '.').replace('%', '').trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function normalizeSlot(rawSlot: unknown): EquipmentSlot | null {
  if (typeof rawSlot !== 'string') return null;
  const s = rawSlot.trim().toLowerCase() as EquipmentSlot;
  return VALID_SLOTS.has(s) ? s : null;
}

function parseSubclasses(raw: unknown): SubclassInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      return {
        index: parseNullableNumber(e.index) ?? idx + 1,
        class: typeof e.class === 'string' ? e.class.trim() : null,
        level: parseNullableNumber(e.level),
        level_progress_pct: parseNullableNumber(e.level_progress_pct),
        hp: parseNullableNumber(e.hp),
        mp: parseNullableNumber(e.mp),
        sp: parseNullableNumber(e.sp),
        creation_date:
          typeof e.creation_date === 'string' ? e.creation_date.trim() : null,
      };
    })
    .filter((x): x is SubclassInfo => x !== null);
}

function normalizeLocation(rawLoc: unknown, captureType: 'character' | 'clan_warehouse'): ItemLocation {
  const loc = String(rawLoc || '').trim().toLowerCase();
  if (VALID_LOCATIONS.has(loc as ItemLocation)) {
    return loc as ItemLocation;
  }
  if (loc === 'equipado') return 'equipped';
  if (loc === 'inventario') return 'inventory';
  if (loc === 'almacen' || loc === 'almacén') return 'warehouse';
  if (loc === 'correo' || loc === 'correo enviado') return 'mail';
  if (loc === 'mascotas') return 'pets';
  if (loc === 'misiones') return 'quests';
  if (loc === 'almacen de clan' || loc === 'almacén de clan') return 'clan_warehouse';
  return captureType === 'clan_warehouse' ? 'clan_warehouse' : 'inventory';
}

function sumAdena(items: ItemEntry[]): number {
  return items.reduce((acc, item) => {
    if (item.name.trim().toLowerCase() === 'adena' && typeof item.quantity === 'number') {
      return acc + item.quantity;
    }
    return acc;
  }, 0);
}

export function parseImportInput(rawInput: string, db: L2Database): ParseImportResult {
  const cleaned = stripMarkdownFences(rawInput);
  if (!cleaned) {
    return {ok: false, previews: [], errors: []};
  }

  let rawObjects: unknown[];
  try {
    rawObjects = splitMultipleJsonInputs(cleaned);
  } catch (err) {
    return {
      ok: false,
      previews: [],
      errors: [err instanceof Error ? err.message : 'Error al analizar el JSON.'],
    };
  }

  const errors: string[] = [];
  const previews: ParsedPayloadPreview[] = [];

  rawObjects.forEach((rawObj, idx) => {
    const labelPrefix = rawObjects.length > 1 ? `Bloque #${idx + 1}: ` : '';
    if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
      errors.push(`${labelPrefix}El elemento raíz debe ser un objeto JSON.`);
      return;
    }

    const obj = rawObj as Record<string, unknown>;
    const server = typeof obj.server === 'string' && obj.server.trim() ? obj.server.trim() : '';
    if (!server) {
      errors.push(`${labelPrefix}Falta el campo obligatorio "server" (ej. "Valakas [x10]").`);
      return;
    }

    const captureTypeRaw = obj.capture_type;
    const captureType: 'character' | 'clan_warehouse' =
      captureTypeRaw === 'clan_warehouse' ? 'clan_warehouse' : 'character';

    if (captureTypeRaw !== 'character' && captureTypeRaw !== 'clan_warehouse') {
      errors.push(
        `${labelPrefix}El campo "capture_type" debe ser "character" o "clan_warehouse".`
      );
      return;
    }

    const account =
      typeof obj.account === 'string' && obj.account.trim() ? obj.account.trim() : null;
    const clanName =
      typeof obj.clan === 'string' && obj.clan.trim() ? obj.clan.trim() : null;

    const rawItems = Array.isArray(obj.items) ? obj.items : [];
    const warnings: string[] = [];

    if (!Array.isArray(obj.items)) {
      warnings.push('No se encontró array "items"; se asumirá lista vacía [].');
    }

    const normalizedItems: ItemEntry[] = [];
    const locationsSet = new Set<ItemLocation>();
    let uncertainCount = 0;

    rawItems.forEach((itemRaw, itemIdx) => {
      if (!itemRaw || typeof itemRaw !== 'object') return;
      const itemObj = itemRaw as Record<string, unknown>;
      const rawName = typeof itemObj.name === 'string' ? itemObj.name.trim() : '';
      const {quantity} = parseQuantity(itemObj.quantity);
      const location = normalizeLocation(itemObj.location, captureType);
      const slot = location === 'equipped' ? normalizeSlot(itemObj.slot) : null;
      const tags = Array.isArray(itemObj.tags)
        ? itemObj.tags.map((t) => String(t).trim()).filter(Boolean)
        : [];
      const name = rawName
        ? resolveItemNameWithGrade(rawName, tags)
        : `Objeto sin nombre (#${itemIdx + 1})`;
      const uncertain = Boolean(itemObj.uncertain) || !rawName || quantity === null;

      if (uncertain) uncertainCount++;
      locationsSet.add(location);

      normalizedItems.push({
        id: generateId('item'),
        name,
        quantity,
        location,
        ...(slot ? {slot} : {}),
        tags,
        ...(uncertain ? {uncertain: true} : {}),
      });
    });

    const otherCharactersDetected = Array.isArray(obj.other_characters)
      ? obj.other_characters.map((c) => String(c).trim()).filter(Boolean)
      : [];

    if (captureType === 'clan_warehouse') {
      if (!clanName) {
        errors.push(
          `${labelPrefix}En capturas "clan_warehouse" el campo "clan" es obligatorio.`
        );
        return;
      }

      const targetId = makeClanId(server, clanName);
      const existingClan = db.clans.find((c) => c.id === targetId);

      previews.push({
        index: idx,
        payload: {
          server,
          account,
          clan: clanName,
          capture_type: 'clan_warehouse',
          character: null,
          items: normalizedItems.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            location: i.location,
            tags: i.tags,
            uncertain: i.uncertain,
          })),
          other_characters: otherCharactersDetected,
        },
        normalizedItems: normalizedItems.map((i) => ({
          ...i,
          location: 'clan_warehouse',
        })),
        actionType: existingClan ? 'update_clan' : 'create_clan',
        targetId,
        targetLabel: clanName,
        server,
        account,
        clanName,
        existingItemCount: existingClan ? existingClan.items.length : 0,
        incomingItemCount: normalizedItems.length,
        existingAdena: existingClan ? sumAdena(existingClan.items) : 0,
        incomingAdena: sumAdena(normalizedItems),
        uncertainCount,
        locationsPresent: ['clan_warehouse'],
        otherCharactersDetected,
        warnings,
      });
      return;
    }

    // Character capture
    if (!account) {
      errors.push(`${labelPrefix}Falta el campo "account" para asociar el personaje.`);
      return;
    }

    const rawChar = obj.character as Record<string, unknown> | null | undefined;
    const charName =
      rawChar && typeof rawChar.name === 'string' && rawChar.name.trim()
        ? rawChar.name.trim()
        : '';

    if (!charName) {
      errors.push(`${labelPrefix}Falta "character.name" en la captura de personaje.`);
      return;
    }

    const targetId = makeCharacterId(server, account, charName);
    const existingChar = db.characters.find((c) => c.id === targetId);

    const actionType = !existingChar
      ? 'create_character'
      : existingChar.status === 'pending'
      ? 'complete_pending_character'
      : 'update_character';

    const payload: RawCapturePayload = {
      server,
      account,
      clan: clanName,
      capture_type: 'character',
      character: {
        name: charName,
        race: typeof rawChar?.race === 'string' ? rawChar.race : null,
        class: typeof rawChar?.class === 'string' ? rawChar.class : null,
        level: parseNullableNumber(rawChar?.level),
        level_progress_pct: parseNullableNumber(rawChar?.level_progress_pct),
        hp: parseNullableNumber(rawChar?.hp),
        mp: parseNullableNumber(rawChar?.mp),
        sp: parseNullableNumber(rawChar?.sp),
        hours_played: parseNullableNumber(rawChar?.hours_played),
        pvp: parseNullableNumber(rawChar?.pvp),
        pk: parseNullableNumber(rawChar?.pk),
        karma: parseNullableNumber(rawChar?.karma),
        points: parseNullableNumber(rawChar?.points),
        noble: typeof rawChar?.noble === 'boolean' ? rawChar.noble : null,
        hero: typeof rawChar?.hero === 'boolean' ? rawChar.hero : null,
        online: typeof rawChar?.online === 'boolean' ? rawChar.online : null,
        location: typeof rawChar?.location === 'string' ? rawChar.location : null,
        creation_date:
          typeof rawChar?.creation_date === 'string'
            ? rawChar.creation_date
            : null,
        last_access: typeof rawChar?.last_access === 'string' ? rawChar.last_access : null,
        last_disconnect:
          typeof rawChar?.last_disconnect === 'string'
            ? rawChar.last_disconnect
            : null,
        subclasses: parseSubclasses(rawChar?.subclasses),
      },
      items: [],
      other_characters: otherCharactersDetected,
    };

    previews.push({
      index: idx,
      payload,
      normalizedItems,
      actionType,
      targetId,
      targetLabel: charName,
      server,
      account,
      clanName,
      existingItemCount: existingChar ? existingChar.items.length : 0,
      incomingItemCount: normalizedItems.length,
      existingAdena: existingChar ? sumAdena(existingChar.items) : 0,
      incomingAdena: sumAdena(normalizedItems),
      uncertainCount,
      locationsPresent: Array.from(locationsSet),
      otherCharactersDetected,
      warnings,
    });
  });

  return {
    ok: errors.length === 0 && previews.length > 0,
    previews,
    errors,
  };
}

export function applyImportPreviews(
  db: L2Database,
  previews: ParsedPayloadPreview[],
  mergeMode: ImportMergeMode
): L2Database {
  const now = new Date().toISOString();
  let characters = [...db.characters];
  let clans = [...db.clans];
  let accounts = [...db.accounts];

  const ensureAccount = (server: string, account: string, lastAccess?: string | null) => {
    const accId = makeAccountId(server, account);
    const existingIdx = accounts.findIndex((a) => a.id === accId);
    if (existingIdx === -1) {
      accounts.push({
        id: accId,
        server,
        account,
        lastAccess: lastAccess || null,
      });
    } else if (lastAccess) {
      accounts[existingIdx] = {
        ...accounts[existingIdx],
        lastAccess,
      };
    }
  };

  const ensureClanExists = (server: string, clanName: string) => {
    const clanId = makeClanId(server, clanName);
    if (!clans.some((c) => c.id === clanId)) {
      clans.push({
        id: clanId,
        server,
        name: clanName,
        items: [],
        updatedAt: now,
      });
    }
  };

  for (const preview of previews) {
    if (preview.account) {
      ensureAccount(
        preview.server,
        preview.account,
        preview.payload.character?.last_access ?? null
      );
    }

    if (preview.payload.capture_type === 'clan_warehouse' && preview.clanName) {
      const existingIdx = clans.findIndex((c) => c.id === preview.targetId);
      const nextClan: ClanRecord = {
        id: preview.targetId,
        server: preview.server,
        name: preview.clanName,
        items: deduplicateItemEntries(preview.normalizedItems),
        updatedAt: now,
      };
      if (existingIdx === -1) {
        clans.push(nextClan);
      } else {
        clans[existingIdx] = nextClan;
      }
      continue;
    }

    // Character import
    const account = preview.account!;
    const charStats = preview.payload.character!;
    const existingIdx = characters.findIndex((c) => c.id === preview.targetId);
    const existing = existingIdx !== -1 ? characters[existingIdx] : null;

    let finalItems = deduplicateItemEntries(preview.normalizedItems);
    if (existing && mergeMode === 'merge_locations' && preview.locationsPresent.length > 0) {
      const incomingLocs = new Set(preview.locationsPresent);
      const preserved = existing.items.filter((it) => !incomingLocs.has(it.location));
      finalItems = deduplicateItemEntries([...preserved, ...preview.normalizedItems]);
    }

    const resolvedClan =
      preview.clanName !== null ? preview.clanName : existing ? existing.clan : null;

    if (resolvedClan) {
      ensureClanExists(preview.server, resolvedClan);
    }

    const nextChar: CharacterRecord = {
      id: preview.targetId,
      server: preview.server,
      account,
      clan: resolvedClan,
      status: 'captured',
      updatedAt: now,
      character: {
        name: preview.targetLabel,
        race: charStats.race ?? existing?.character.race ?? null,
        class: charStats.class ?? existing?.character.class ?? null,
        level: charStats.level ?? existing?.character.level ?? null,
        level_progress_pct:
          charStats.level_progress_pct ?? existing?.character.level_progress_pct ?? null,
        hp: charStats.hp ?? existing?.character.hp ?? null,
        mp: charStats.mp ?? existing?.character.mp ?? null,
        sp: charStats.sp ?? existing?.character.sp ?? null,
        hours_played: charStats.hours_played ?? existing?.character.hours_played ?? null,
        pvp: charStats.pvp ?? existing?.character.pvp ?? null,
        pk: charStats.pk ?? existing?.character.pk ?? null,
        karma: charStats.karma ?? existing?.character.karma ?? null,
        points: charStats.points ?? existing?.character.points ?? null,
        noble: charStats.noble ?? existing?.character.noble ?? null,
        hero: charStats.hero ?? existing?.character.hero ?? null,
        online: charStats.online ?? existing?.character.online ?? null,
        location: charStats.location ?? existing?.character.location ?? null,
        creation_date:
          charStats.creation_date ?? existing?.character.creation_date ?? null,
        last_access: charStats.last_access ?? existing?.character.last_access ?? null,
        last_disconnect:
          charStats.last_disconnect ?? existing?.character.last_disconnect ?? null,
        subclasses:
          charStats.subclasses && charStats.subclasses.length > 0
            ? charStats.subclasses
            : existing?.character.subclasses ?? [],
      },
      items: finalItems,
    };

    if (existingIdx === -1) {
      characters.push(nextChar);
    } else {
      characters[existingIdx] = nextChar;
    }

    // Register any other_characters detected on the same account as pending stubs
    for (const otherName of preview.otherCharactersDetected) {
      if (!otherName || otherName.toLowerCase() === preview.targetLabel.toLowerCase()) {
        continue;
      }
      const otherId = makeCharacterId(preview.server, account, otherName);
      if (!characters.some((c) => c.id === otherId)) {
        characters.push({
          id: otherId,
          server: preview.server,
          account,
          clan: null,
          status: 'pending',
          updatedAt: now,
          character: {
            name: otherName,
            race: null,
            class: null,
            level: null,
            level_progress_pct: null,
            hp: null,
            mp: null,
            sp: null,
            hours_played: null,
            pvp: null,
            pk: null,
            karma: null,
            noble: null,
            hero: null,
            online: null,
            location: null,
            last_access: null,
          },
          items: [],
        });
      }
    }
  }

  return {
    version: 1,
    characters,
    clans,
    accounts,
    iconBaseUrl: db.iconBaseUrl,
    itemCatalog: db.itemCatalog,
    updatedAt: now,
  };
}
