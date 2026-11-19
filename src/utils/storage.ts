import {createStarterDatabase} from '../data/starterData';
import {ItemCatalogEntry, ItemEntry, ItemLocation, L2Database} from '../types/l2';

const STORAGE_KEY = 'l2es_vault_db_v1';

export const DEFAULT_ICON_BASE_URL = 'https://l2j.ru/img/icons/';

export type ItemGradeCategory = 'No-Grade' | 'D' | 'C' | 'B' | 'A' | 'S';
export type ItemArmorType = 'Heavy Armor' | 'Light Armor' | 'Robe';

const GRADE_LABELS: Record<string, string> = {
  ng: 'No-Grade',
  'no-grade': 'No-Grade',
  d: 'D-Grade',
  c: 'C-Grade',
  b: 'B-Grade',
  a: 'A-Grade',
  s: 'S-Grade',
  s80: 'S-Grade',
  s84: 'S-Grade',
};

const GRADE_CATEGORIES: Record<string, ItemGradeCategory> = {
  ng: 'No-Grade',
  'no-grade': 'No-Grade',
  d: 'D',
  c: 'C',
  b: 'B',
  a: 'A',
  s: 'S',
  s80: 'S',
  s84: 'S',
};

const ARMOR_SLOT_NOUN_RE =
  /\b(?:gloves|gauntlets|boots|shoes|greaves|gaiters|stockings|hose|leggings|helmet|circlet|cap|hat|tunic|doublet|breastplate|cuirass|plate\s+armor|leather\s+armor|hauberk|brigandine|shirt|sigil|shield|armor)\b$/i;

function formatGradeToken(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return GRADE_LABELS[clean] || null;
}

function parseGradeCategoryToken(raw: string): ItemGradeCategory | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return GRADE_CATEGORIES[clean] || null;
}

function parseArmorTypeToken(raw: string): ItemArmorType | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (/^heavy(?:\s+(?:armou?r|armo))?$/i.test(t) || t === 'pesada') {
    return 'Heavy Armor';
  }
  if (/^light(?:\s+(?:armou?r|armo))?$/i.test(t) || t === 'ligera') {
    return 'Light Armor';
  }
  if (t === 'robe' || t === 'túnica' || t === 'tunica') {
    return 'Robe';
  }
  return null;
}

function extractGradeFromTags(tags: string[]): string | null {
  for (const tag of tags) {
    const t = tag.trim();
    if (!t) continue;
    const prefixMatch = t.match(
      /^(?:grade|grado)[-\s:]*(no[-\s]?grade|ng|s84|s80|[sabcd])$/i
    );
    if (prefixMatch) {
      const formatted = formatGradeToken(prefixMatch[1]);
      if (formatted) return formatted;
    }
    const suffixMatch = t.match(
      /^(no[-\s]?grade|ng|s84|s80|[sabcd])(?:[-\s]*(?:grade|grado))?$/i
    );
    if (suffixMatch) {
      const formatted = formatGradeToken(suffixMatch[1]);
      if (formatted) return formatted;
    }
  }
  return null;
}

function extractArmorTypeFromTags(tags: string[]): ItemArmorType | null {
  for (const tag of tags) {
    const parsed = parseArmorTypeToken(tag);
    if (parsed) return parsed;
  }
  return null;
}

function extractSoulCrystalStageFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const t = tag.trim();
    if (!t) continue;
    const labeled = t.match(
      /^(?:stage|lv\.?|level|nivel|step)[-\s:]*(1[0-8]|[1-9])$/i
    );
    if (labeled) return Number(labeled[1]);
    const numeric = t.match(/^(1[0-8]|[1-9])$/);
    if (numeric) return Number(numeric[1]);
  }
  return null;
}

function parseGradeTokenStrict(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const prefixMatch = t.match(
    /^(?:grade|grado)[-\s:]*(no[-\s]?grade|ng|s84|s80|[sabcd])$/i
  );
  if (prefixMatch) return formatGradeToken(prefixMatch[1]);
  const suffixMatch = t.match(
    /^(no[-\s]?grade|ng|s84|s80|[sabcd])(?:[-\s]*(?:grade|grado))?$/i
  );
  if (suffixMatch) return formatGradeToken(suffixMatch[1]);
  return null;
}

function parseTrailingModifiers(rawName: string): {
  base: string;
  armorType: ItemArmorType | null;
  grade: string | null;
} {
  let current = rawName.trim().replace(/\s+/g, ' ');
  let armorType: ItemArmorType | null = null;
  let grade: string | null = null;

  while (current) {
    let matched = false;

    // 1. Trailing parenthesized or bracketed modifier(s): e.g. "(Heavy Armor)", "(B-Grade)", "(Heavy Armor, B-Grade)", "[S]"
    const parenMatch = current.match(/^(.*?)\s*(?:\(([^()]+)\)|\[([^\[\]]+)\])$/);
    if (parenMatch) {
      const inner = (parenMatch[2] || parenMatch[3] || '').trim();
      const candidateBase = parenMatch[1].trim();
      if (candidateBase && inner) {
        const parts = inner
          .split(/[,/|·]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        let allValid = parts.length > 0;
        let foundArmor: ItemArmorType | null = null;
        let foundGrade: string | null = null;

        for (const part of parts) {
          const a = parseArmorTypeToken(part);
          if (a) {
            foundArmor = foundArmor || a;
            continue;
          }
          const g = parseGradeTokenStrict(part);
          if (g) {
            foundGrade = foundGrade || g;
            continue;
          }
          allValid = false;
          break;
        }

        if (allValid) {
          if (foundArmor && !armorType) armorType = foundArmor;
          if (foundGrade && !grade) grade = foundGrade;
          current = candidateBase;
          matched = true;
        }
      }
    }
    if (matched) continue;

    // 2. Bare trailing "Heavy Armor" / "Light Armor" (including minor typo "Armo"): e.g. "Blue Wolf Gloves Heavy Armor"
    const armorFullMatch = current.match(
      /^(.*?)(?:\s*[-–]\s*|\s+)(heavy\s+(?:armou?r|armo)|light\s+(?:armou?r|armo))$/i
    );
    if (armorFullMatch && armorFullMatch[1].trim()) {
      const parsedArmor = parseArmorTypeToken(armorFullMatch[2]);
      if (parsedArmor) {
        if (!armorType) armorType = parsedArmor;
        current = armorFullMatch[1].trim();
        continue;
      }
    }

    // 3. Bare trailing "Heavy" / "Light" / "Robe" after an armor slot noun: e.g. "Blue Wolf Gloves Robe"
    const armorShortMatch = current.match(
      /^(.*?)(?:\s*[-–]\s*|\s+)(heavy|light|robe)$/i
    );
    if (armorShortMatch) {
      const candidateBase = armorShortMatch[1].trim();
      if (candidateBase && ARMOR_SLOT_NOUN_RE.test(candidateBase)) {
        const parsedArmor = parseArmorTypeToken(armorShortMatch[2]);
        if (parsedArmor) {
          if (!armorType) armorType = parsedArmor;
          current = candidateBase;
          continue;
        }
      }
    }

    // 4. Bare trailing grade with hyphen ("- B", "- A-Grade") or explicit "Grade X" / "X-Grade"
    const bareGradeMatch = current.match(
      /^(.*?)(?:\s*[-–]\s*(?:(?:grade|grado)[-\s:]*)?(no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?|\s+(?:(?:grade|grado)[-\s:]+(no[-\s]?grade|ng|s84|s80|[sabcd])|(no[-\s]?grade|s84|s80|[sabcd])\s*-?\s*grade))$/i
    );
    if (bareGradeMatch && bareGradeMatch[1].trim()) {
      const rawG = bareGradeMatch[2] || bareGradeMatch[3] || bareGradeMatch[4];
      const formatted = rawG ? formatGradeToken(rawG) : null;
      if (formatted) {
        if (!grade) grade = formatted;
        current = bareGradeMatch[1].trim();
        continue;
      }
    }

    break;
  }

  return {base: current, armorType, grade};
}

function hasArmorTypeInBase(base: string, armorType: ItemArmorType): boolean {
  if (armorType === 'Robe') return /\brobe\b/i.test(base);
  if (armorType === 'Heavy Armor') return /\bheavy\s+armou?r\b/i.test(base);
  return /\blight\s+armou?r\b/i.test(base);
}

/**
 * Strips any trailing armor demarcation (`(Heavy Armor)`, `(Light Armor)`, `(Robe)`)
 * and grade suffix (`(D-Grade)`..`(S-Grade)`) to recover the raw item base name.
 */
export function stripGradeAndArmorFromItemName(name: string): string {
  return parseTrailingModifiers(name).base;
}

export function extractItemGradeCategory(
  name: string,
  tags?: string[] | null
): ItemGradeCategory | null {
  const {grade} = parseTrailingModifiers(name);
  if (grade) {
    const clean = grade.replace(/-grade$/i, '').trim();
    const parsed = parseGradeCategoryToken(clean);
    if (parsed) return parsed;
  }
  const cleanTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const fromTags = extractGradeFromTags(cleanTags);
  if (fromTags) {
    return parseGradeCategoryToken(fromTags.replace(/-grade$/i, '').trim());
  }
  return null;
}

export function extractItemArmorType(
  name: string,
  tags?: string[] | null
): ItemArmorType | null {
  const {base, armorType} = parseTrailingModifiers(name);
  if (armorType) return armorType;
  const cleanTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const fromTags = extractArmorTypeFromTags(cleanTags);
  if (fromTags) return fromTags;
  if (/\brobe\b/i.test(base)) return 'Robe';
  return null;
}

export function updateItemNameAndTags(
  currentName: string,
  currentTagsRaw: string,
  patch: {
    grade?: ItemGradeCategory | '';
    armorType?: ItemArmorType | '';
  }
): {name: string; tags: string} {
  const tagsList = currentTagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const nonGradeTags =
    patch.grade !== undefined
      ? tagsList.filter((t) => !parseGradeTokenStrict(t))
      : tagsList;

  const finalTags =
    patch.armorType !== undefined
      ? nonGradeTags.filter((t) => !parseArmorTypeToken(t))
      : nonGradeTags;

  if (patch.grade) {
    finalTags.unshift(patch.grade === 'No-Grade' ? 'NG' : patch.grade);
  }
  if (patch.armorType) {
    finalTags.push(patch.armorType);
  }

  const parsed = parseTrailingModifiers(currentName);
  const nextArmorType =
    patch.armorType !== undefined
      ? patch.armorType || null
      : parsed.armorType || extractArmorTypeFromTags(finalTags);
  const nextGrade =
    patch.grade !== undefined
      ? patch.grade
        ? formatGradeToken(patch.grade)
        : null
      : parsed.grade || extractGradeFromTags(finalTags);

  let nextName = parsed.base || currentName.trim();
  if (nextArmorType && !hasArmorTypeInBase(nextName, nextArmorType)) {
    nextName = `${nextName} (${nextArmorType})`;
  }
  if (nextGrade) {
    nextName = `${nextName} (${nextGrade})`;
  }

  return {
    name: nextName,
    tags: Array.from(new Set(finalTags)).join(', '),
  };
}

/**
 * Ensures items preserve and standardize:
 * - Soul Crystal stage (`- Stage 1..18`) or grade
 * - Armor type demarcation (`(Heavy Armor)`, `(Light Armor)`, `(Robe)`)
 * - Equipment/Scroll/Crystal/Shot/Elixir grade (`(D-Grade)`, `(C-Grade)`, `(B-Grade)`, `(A-Grade)`, `(S-Grade)`, `(No-Grade)`)
 */
export function resolveItemNameWithGrade(
  name: string,
  tags?: string[] | null
): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const cleanTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  // 1. Soul Crystals (e.g. Red Soul Crystal - Stage 12, Blue Soul Crystal - Stage 10)
  if (/\bsoul\s+crystal\b/i.test(trimmed)) {
    const stageMatch = trimmed.match(
      /^(.*?)\s*(?:\[\s*(?:(?:stage|lv\.?|level|nivel|step)[-\s:]*)?(1[0-8]|[1-9])\s*\]|\(\s*(?:(?:stage|lv\.?|level|nivel|step)[-\s:]*)?(1[0-8]|[1-9])\s*\)|[-–]\s*(?:(?:stage|lv\.?|level|nivel|step)[-\s:]*)?(1[0-8]|[1-9])|\s+(?:stage|lv\.?|level|nivel|step)[-\s:]*(1[0-8]|[1-9])|\s+(1[0-8]|[1-9]))$/i
    );
    if (stageMatch) {
      const base = stageMatch[1].trim();
      const stage =
        stageMatch[2] ||
        stageMatch[3] ||
        stageMatch[4] ||
        stageMatch[5] ||
        stageMatch[6];
      if (base && stage) {
        return `${base} - Stage ${stage}`;
      }
    }

    if (/\b(?:stage|lv\.?|level|nivel|step)\s*(?:1[0-8]|[1-9])\b/i.test(trimmed)) {
      return trimmed;
    }

    const stageFromTag = extractSoulCrystalStageFromTags(cleanTags);
    if (stageFromTag !== null) {
      return `${trimmed} - Stage ${stageFromTag}`;
    }

    const {base, grade} = parseTrailingModifiers(trimmed);
    const resolvedGrade = grade || extractGradeFromTags(cleanTags);
    return resolvedGrade ? `${base} (${resolvedGrade})` : trimmed;
  }

  // 2. Armors, Weapons, Shields, Jewels, Scrolls, Crystals, Shots, Elixirs
  const {base, armorType, grade} = parseTrailingModifiers(trimmed);
  const resolvedArmorType = armorType || extractArmorTypeFromTags(cleanTags);
  const resolvedGrade = grade || extractGradeFromTags(cleanTags);

  let out = base || trimmed;
  if (resolvedArmorType && !hasArmorTypeInBase(out, resolvedArmorType)) {
    out = `${out} (${resolvedArmorType})`;
  }
  if (resolvedGrade) {
    out = `${out} (${resolvedGrade})`;
  }
  return out;
}

/**
 * Removes Lineage 2 enchant prefixes ("+1 ", "+3 ", "+16 ") and condition
 * prefixes ("Augmented ") from an item name so variants like
 * "+1 Dynasty Stockings", "Augmented Angel Slayer", or "+4 Augmented Angel Slayer"
 * resolve to their single base item name ("Dynasty Stockings", "Angel Slayer").
 */
export function stripItemEnchantPrefix(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  let current = trimmed;
  while (true) {
    const next = current
      .replace(/^\+\s*\d+\s+/, '')
      .replace(/^augmented\s+/i, '')
      .trim();
    if (!next || next === current) break;
    current = next;
  }
  return current || trimmed;
}

export function normalizeExactItemKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeItemKey(name: string): string {
  const withoutEnchant = stripItemEnchantPrefix(name);
  return resolveItemNameWithGrade(withoutEnchant).toLowerCase();
}

export function normalizeItemCatalog(
  rawCatalog: Record<string, ItemCatalogEntry> | undefined | null
): Record<string, ItemCatalogEntry> {
  const result: Record<string, ItemCatalogEntry> = {};
  if (!rawCatalog || typeof rawCatalog !== 'object') return result;

  for (const entry of Object.values(rawCatalog)) {
    if (!entry || typeof entry.name !== 'string') continue;
    const cleanName = resolveItemNameWithGrade(stripItemEnchantPrefix(entry.name));
    if (!cleanName) continue;
    const key = normalizeItemKey(cleanName);
    const normalizedEntry: ItemCatalogEntry = {
      ...entry,
      key,
      name: cleanName,
    };

    const existing = result[key];
    if (!existing) {
      result[key] = normalizedEntry;
      continue;
    }

    const existingHasIcon = Boolean(existing.icon && existing.icon.trim());
    const incomingHasIcon = Boolean(
      normalizedEntry.icon && normalizedEntry.icon.trim()
    );
    const existingWasClean =
      existing.name.trim().toLowerCase() === cleanName.toLowerCase();

    if (!existingHasIcon && incomingHasIcon) {
      result[key] = normalizedEntry;
    } else if (existingHasIcon === incomingHasIcon) {
      const existingTs = Date.parse(existing.updatedAt || '') || 0;
      const incomingTs = Date.parse(normalizedEntry.updatedAt || '') || 0;
      if (incomingTs > existingTs || (!existingWasClean && incomingHasIcon)) {
        result[key] = normalizedEntry;
      }
    }
  }

  return result;
}

export function normalizeIconInput(raw: string, baseUrl = DEFAULT_ICON_BASE_URL): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    if (trimmed.toLowerCase().startsWith(cleanBase.toLowerCase())) {
      return trimmed.slice(cleanBase.length);
    }
    return trimmed;
  }
  if (trimmed.includes('.')) return trimmed;
  return `${trimmed}.png`;
}

export function resolveItemIconUrl(
  iconValue: string | undefined | null,
  baseUrl = DEFAULT_ICON_BASE_URL
): string | null {
  if (!iconValue || !iconValue.trim()) return null;
  const trimmed = iconValue.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const cleanBase = (baseUrl || DEFAULT_ICON_BASE_URL).trim();
  const prefix = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;
  const file = trimmed.includes('.') ? trimmed : `${trimmed}.png`;
  return `${prefix}${file}`;
}

function normalizeStoredItems(items: unknown): ItemEntry[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw as ItemEntry;
    const entry = raw as ItemEntry;
    const tags = Array.isArray(entry.tags)
      ? entry.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    return {
      ...entry,
      name: resolveItemNameWithGrade(String(entry.name || ''), tags),
      tags,
    };
  });
}

function normalizeDatabaseRecord(raw: L2Database): L2Database {
  return {
    version: 1,
    characters: (raw.characters || []).map((c) => ({
      ...c,
      items: normalizeStoredItems(c.items),
    })),
    clans: (raw.clans || []).map((cl) => ({
      ...cl,
      items: normalizeStoredItems(cl.items),
    })),
    accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
    iconBaseUrl:
      typeof raw.iconBaseUrl === 'string' && raw.iconBaseUrl.trim()
        ? raw.iconBaseUrl
        : DEFAULT_ICON_BASE_URL,
    itemCatalog: normalizeItemCatalog(raw.itemCatalog),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function loadDatabase(): L2Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const starter = normalizeDatabaseRecord(createStarterDatabase());
      saveDatabase(starter);
      return starter;
    }
    const parsed = JSON.parse(raw) as L2Database;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.characters) ||
      !Array.isArray(parsed.clans)
    ) {
      const starter = normalizeDatabaseRecord(createStarterDatabase());
      saveDatabase(starter);
      return starter;
    }
    return normalizeDatabaseRecord(parsed);
  } catch {
    return normalizeDatabaseRecord(createStarterDatabase());
  }
}

export function saveDatabase(db: L2Database): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function exportDatabaseAsFile(db: L2Database): void {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `l2es-vault-respaldo-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-ES').format(value);
}

export function formatAdenaShort(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return formatInt(value);
}

export const LOCATION_LABELS: Record<ItemLocation, string> = {
  equipped: 'Equipado',
  inventory: 'Inventario',
  warehouse: 'Almacén',
  mail: 'Correo enviado',
  pets: 'Mascotas',
  quests: 'Misiones',
  clan_warehouse: 'Almacén de clan',
};

export const CHARACTER_LOCATIONS: ItemLocation[] = [
  'equipped',
  'inventory',
  'warehouse',
  'mail',
  'pets',
  'quests',
];

export const ALL_LOCATIONS: ItemLocation[] = [
  'equipped',
  'inventory',
  'warehouse',
  'mail',
  'pets',
  'quests',
  'clan_warehouse',
];

export function formatDateShort(isoOrStr: string | null | undefined): string {
  if (!isoOrStr) return '—';
  return isoOrStr.replace('T', ' ').slice(0, 16);
}
