import {
  AccountMeta,
  CharacterRecord,
  ClanRecord,
  ItemCatalogEntry,
  ItemEntry,
  L2Database,
} from '../types/l2';
import {
  DEFAULT_ICON_BASE_URL,
  normalizeExactItemKey,
  normalizeItemKey,
  stripItemEnchantPrefix,
} from './storage';

/**
 * Parses ISO timestamps, SQL timestamps (`YYYY-MM-DD HH:mm:ss`),
 * or L2 EU timestamps (`DD/MM/YYYY HH:mm` / `DD/MM/YYYY`) into epoch ms.
 * Returns 0 if missing or unparseable.
 */
export function parseFlexibleTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;

  // DD/MM/YYYY or DD/MM/YYYY HH:mm(:ss)
  const euMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (euMatch) {
    const day = Number(euMatch[1]);
    const month = Number(euMatch[2]) - 1;
    const year = Number(euMatch[3]);
    const hour = euMatch[4] ? Number(euMatch[4]) : 0;
    const min = euMatch[5] ? Number(euMatch[5]) : 0;
    const sec = euMatch[6] ? Number(euMatch[6]) : 0;
    const ms = new Date(year, month, day, hour, min, sec).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }

  // Standard ISO or YYYY-MM-DD HH:mm(:ss)
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(trimmed)
    ? trimmed.replace(/\s+/, 'T')
    : trimmed;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Deduplicates an item list without ever summing quantities or keeping duplicate rows.
 * Two entries are considered duplicates if they share the same `id` (non-empty) OR
 * the same `(normalizedName, location, slot, sortedNormalizedTags)`, or the same
 * occupied equipment slot (`location === 'equipped' && slot`).
 * When a duplicate is found, the later/better entry replaces the earlier one.
 */
export function deduplicateItemEntries(items: ItemEntry[]): ItemEntry[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result: ItemEntry[] = [];
  const keyToIndex = new Map<string, number>();
  const slotToIndex = new Map<string, number>();
  const idToIndex = new Map<string, number>();

  const scoreItem = (it: ItemEntry): number => {
    let score = 0;
    if (!it.uncertain) score += 4;
    if (typeof it.quantity === 'number' && Number.isFinite(it.quantity)) score += 2;
    if (it.slot) score += 1;
    if (it.tags && it.tags.length > 0) score += 1;
    return score;
  };

  for (const raw of items) {
    if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) continue;

    const cleanTags = Array.isArray(raw.tags)
      ? Array.from(new Set(raw.tags.map((t) => t.trim()).filter(Boolean)))
      : [];
    const sortedTagKey = cleanTags
      .map((t) => t.toLowerCase())
      .sort()
      .join('|');
    const cleanSlot = raw.slot || null;
    const normalizedItem: ItemEntry = {
      ...raw,
      name: raw.name.trim(),
      slot: cleanSlot,
      tags: cleanTags,
      quantity:
        typeof raw.quantity === 'number' && Number.isFinite(raw.quantity)
          ? raw.quantity
          : null,
      uncertain: Boolean(raw.uncertain),
    };

    const semanticKey = `${normalizeExactItemKey(normalizedItem.name)}::${normalizedItem.location}::${cleanSlot || ''}::${sortedTagKey}`;
    const equippedSlotKey =
      normalizedItem.location === 'equipped' && cleanSlot
        ? `equipped::${cleanSlot}`
        : null;

    let existingIdx: number | undefined;
    if (normalizedItem.id && idToIndex.has(normalizedItem.id)) {
      existingIdx = idToIndex.get(normalizedItem.id);
    } else if (keyToIndex.has(semanticKey)) {
      existingIdx = keyToIndex.get(semanticKey);
    } else if (equippedSlotKey && slotToIndex.has(equippedSlotKey)) {
      existingIdx = slotToIndex.get(equippedSlotKey);
    }

    if (existingIdx !== undefined) {
      const current = result[existingIdx];
      // Prefer the more complete/certain entry, or the latest entry on tie
      if (scoreItem(normalizedItem) >= scoreItem(current)) {
        result[existingIdx] = normalizedItem;
        if (normalizedItem.id) idToIndex.set(normalizedItem.id, existingIdx);
        keyToIndex.set(semanticKey, existingIdx);
        if (equippedSlotKey) slotToIndex.set(equippedSlotKey, existingIdx);
      }
      continue;
    }

    const idx = result.length;
    result.push(normalizedItem);
    if (normalizedItem.id) idToIndex.set(normalizedItem.id, idx);
    keyToIndex.set(semanticKey, idx);
    if (equippedSlotKey) slotToIndex.set(equippedSlotKey, idx);
  }

  return result;
}

function getCharacterTimestamp(char: CharacterRecord, dbFallbackTs: number): number {
  return Math.max(
    parseFlexibleTimestamp(char.updatedAt),
    parseFlexibleTimestamp(char.character?.last_access),
    parseFlexibleTimestamp(char.character?.last_disconnect),
    dbFallbackTs
  );
}

function getClanTimestamp(clan: ClanRecord, dbFallbackTs: number): number {
  return Math.max(parseFlexibleTimestamp(clan.updatedAt), dbFallbackTs);
}

function canonicalCharKey(char: CharacterRecord): string {
  return `${char.server.trim().toLowerCase()}::${char.account
    .trim()
    .toLowerCase()}::${(char.character?.name || '').trim().toLowerCase()}`;
}

function canonicalClanKey(clan: ClanRecord): string {
  return `${clan.server.trim().toLowerCase()}::${clan.name.trim().toLowerCase()}`;
}

function canonicalAccountKey(acc: AccountMeta): string {
  return `${acc.server.trim().toLowerCase()}::${acc.account.trim().toLowerCase()}`;
}

function pickBestCharacter(
  existing: CharacterRecord,
  existingDbTs: number,
  incoming: CharacterRecord,
  incomingDbTs: number
): CharacterRecord {
  // Captured data always beats an empty pending stub
  if (existing.status === 'pending' && incoming.status === 'captured') {
    return {
      ...incoming,
      items: deduplicateItemEntries(incoming.items),
    };
  }
  if (incoming.status === 'pending' && existing.status === 'captured') {
    return {
      ...existing,
      items: deduplicateItemEntries(existing.items),
    };
  }

  const existingTs = getCharacterTimestamp(existing, existingDbTs);
  const incomingTs = getCharacterTimestamp(incoming, incomingDbTs);

  if (incomingTs > existingTs) {
    return {
      ...incoming,
      items: deduplicateItemEntries(incoming.items),
    };
  }
  if (existingTs > incomingTs) {
    return {
      ...existing,
      items: deduplicateItemEntries(existing.items),
    };
  }

  // Exact timestamp tie: prefer whichever has more items / captured details, never concatenating
  const winner =
    (incoming.items?.length || 0) > (existing.items?.length || 0)
      ? incoming
      : existing;
  return {
    ...winner,
    items: deduplicateItemEntries(winner.items),
  };
}

function pickBestClan(
  existing: ClanRecord,
  existingDbTs: number,
  incoming: ClanRecord,
  incomingDbTs: number
): ClanRecord {
  const existingTs = getClanTimestamp(existing, existingDbTs);
  const incomingTs = getClanTimestamp(incoming, incomingDbTs);

  if (incomingTs > existingTs) {
    return {
      ...incoming,
      items: deduplicateItemEntries(incoming.items),
    };
  }
  if (existingTs > incomingTs) {
    return {
      ...existing,
      items: deduplicateItemEntries(existing.items),
    };
  }

  const winner =
    (incoming.items?.length || 0) > (existing.items?.length || 0)
      ? incoming
      : existing;
  return {
    ...winner,
    items: deduplicateItemEntries(winner.items),
  };
}

function pickBestAccount(
  existing: AccountMeta,
  existingDbTs: number,
  incoming: AccountMeta,
  incomingDbTs: number
): AccountMeta {
  const existingTs = Math.max(
    parseFlexibleTimestamp(existing.lastAccess),
    existingDbTs
  );
  const incomingTs = Math.max(
    parseFlexibleTimestamp(incoming.lastAccess),
    incomingDbTs
  );

  const primary = incomingTs > existingTs ? incoming : existing;
  const secondary = incomingTs > existingTs ? existing : incoming;

  return {
    ...secondary,
    ...primary,
    email: primary.email?.trim() ? primary.email : secondary.email ?? null,
    password: primary.password?.trim()
      ? primary.password
      : secondary.password ?? null,
    ssn: primary.ssn?.trim() ? primary.ssn : secondary.ssn ?? null,
    notes: primary.notes?.trim() ? primary.notes : secondary.notes ?? null,
    lastAccess: primary.lastAccess?.trim()
      ? primary.lastAccess
      : secondary.lastAccess ?? null,
    expectedCharacters:
      primary.expectedCharacters ?? secondary.expectedCharacters ?? null,
  };
}

/**
 * Merges two L2Database snapshots cleanly:
 * - Resolves conflicts strictly by latest timestamp (`updatedAt` / `last_access`)
 * - Never duplicates characters, clans, accounts, catalog entries, or items
 * - Never sums or duplicates item quantities across snapshots
 */
export function mergeDatabasesByTimestamp(
  prev: L2Database,
  incoming: L2Database
): L2Database {
  const prevDbTs = parseFlexibleTimestamp(prev.updatedAt);
  const incomingDbTs = parseFlexibleTimestamp(incoming.updatedAt);

  // 1. Merge Characters
  const charMap = new Map<string, CharacterRecord>();
  (prev.characters || []).forEach((c) => {
    const key = canonicalCharKey(c);
    const cleaned: CharacterRecord = {
      ...c,
      items: deduplicateItemEntries(c.items),
    };
    const existing = charMap.get(key);
    charMap.set(
      key,
      existing ? pickBestCharacter(existing, prevDbTs, cleaned, prevDbTs) : cleaned
    );
  });
  (incoming.characters || []).forEach((c) => {
    const key = canonicalCharKey(c);
    const cleaned: CharacterRecord = {
      ...c,
      items: deduplicateItemEntries(c.items),
    };
    const existing = charMap.get(key);
    charMap.set(
      key,
      existing
        ? pickBestCharacter(existing, prevDbTs, cleaned, incomingDbTs)
        : cleaned
    );
  });

  // 2. Merge Clans
  const clanMap = new Map<string, ClanRecord>();
  (prev.clans || []).forEach((cl) => {
    const key = canonicalClanKey(cl);
    const cleaned: ClanRecord = {
      ...cl,
      items: deduplicateItemEntries(cl.items),
    };
    const existing = clanMap.get(key);
    clanMap.set(
      key,
      existing ? pickBestClan(existing, prevDbTs, cleaned, prevDbTs) : cleaned
    );
  });
  (incoming.clans || []).forEach((cl) => {
    const key = canonicalClanKey(cl);
    const cleaned: ClanRecord = {
      ...cl,
      items: deduplicateItemEntries(cl.items),
    };
    const existing = clanMap.get(key);
    clanMap.set(
      key,
      existing
        ? pickBestClan(existing, prevDbTs, cleaned, incomingDbTs)
        : cleaned
    );
  });

  // 3. Merge Accounts
  const accMap = new Map<string, AccountMeta>();
  (prev.accounts || []).forEach((a) => {
    const key = canonicalAccountKey(a);
    const existing = accMap.get(key);
    accMap.set(
      key,
      existing ? pickBestAccount(existing, prevDbTs, a, prevDbTs) : a
    );
  });
  (incoming.accounts || []).forEach((a) => {
    const key = canonicalAccountKey(a);
    const existing = accMap.get(key);
    accMap.set(
      key,
      existing ? pickBestAccount(existing, prevDbTs, a, incomingDbTs) : a
    );
  });

  // 4. Merge Item Catalog by latest updatedAt
  const mergedCatalog: Record<string, ItemCatalogEntry> = {};
  const upsertCatalogEntry = (
    entry: ItemCatalogEntry,
    fallbackTs: number
  ) => {
    if (!entry || !entry.name?.trim()) return;
    const cleanName = stripItemEnchantPrefix(entry.name);
    if (!cleanName) return;
    const key = normalizeItemKey(cleanName);
    const normalizedEntry: ItemCatalogEntry = {
      ...entry,
      key,
      name: cleanName,
    };
    const existing = mergedCatalog[key];
    if (!existing) {
      mergedCatalog[key] = normalizedEntry;
      return;
    }
    const existingTs = Math.max(
      parseFlexibleTimestamp(existing.updatedAt),
      prevDbTs
    );
    const candidateTs = Math.max(
      parseFlexibleTimestamp(normalizedEntry.updatedAt),
      fallbackTs
    );
    if (candidateTs > existingTs) {
      mergedCatalog[key] = normalizedEntry;
    } else if (
      candidateTs === existingTs &&
      !existing.icon &&
      normalizedEntry.icon
    ) {
      mergedCatalog[key] = normalizedEntry;
    }
  };

  Object.values(prev.itemCatalog || {}).forEach((e) =>
    upsertCatalogEntry(e, prevDbTs)
  );
  Object.values(incoming.itemCatalog || {}).forEach((e) =>
    upsertCatalogEntry(e, incomingDbTs)
  );

  const iconBaseUrl =
    incomingDbTs > prevDbTs && incoming.iconBaseUrl?.trim()
      ? incoming.iconBaseUrl.trim()
      : prev.iconBaseUrl?.trim() ||
        incoming.iconBaseUrl?.trim() ||
        DEFAULT_ICON_BASE_URL;

  return {
    version: 1,
    characters: Array.from(charMap.values()),
    clans: Array.from(clanMap.values()),
    accounts: Array.from(accMap.values()),
    iconBaseUrl,
    itemCatalog: mergedCatalog,
    updatedAt: new Date(Math.max(prevDbTs, incomingDbTs, Date.now())).toISOString(),
  };
}
