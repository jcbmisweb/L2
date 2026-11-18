import {createStarterDatabase} from '../data/starterData';
import {ItemCatalogEntry, ItemEntry, ItemLocation, L2Database} from '../types/l2';

const STORAGE_KEY = 'l2es_vault_db_v1';

export const DEFAULT_ICON_BASE_URL = 'https://l2j.ru/img/icons/';

const GRADE_LABELS: Record<string, string> = {
  ng: 'No-Grade',
  'no-grade': 'No-Grade',
  d: 'D-Grade',
  c: 'C-Grade',
  b: 'B-Grade',
  a: 'A-Grade',
  s: 'S-Grade',
  s80: 'S80-Grade',
  s84: 'S84-Grade',
};

function formatGradeToken(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return GRADE_LABELS[clean] || null;
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

function hasGradeInName(name: string): boolean {
  return (
    /\(\s*(?:no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?\s*\)/i.test(
      name
    ) ||
    /\(\s*(?:grade|grado)\s+(?:no[-\s]?grade|ng|s84|s80|[sabcd])\s*\)/i.test(
      name
    ) ||
    /\[\s*(?:no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?\s*\]/i.test(
      name
    ) ||
    /\b(?:no[-\s]?grade|s84|s80|[sabcd])\s*-?\s*grade\b/i.test(name) ||
    /\b(?:grade|grado)\s+(?:no[-\s]?grade|ng|s84|s80|[sabcd])\b/i.test(name) ||
    /(?:\s+-\s+|\s+)(?:s84|s80|[sabcd])$/i.test(name)
  );
}

function isGradeDifferentiatedItem(name: string): boolean {
  return (
    /\bscroll:\s*enchant\b/i.test(name) ||
    /\b(?:ancient|divine|crystal)\s*crystal:\s*enchant\b/i.test(name) ||
    /\bscroll:\s*recovery\b/i.test(name) ||
    /^crystal(?:\s*[\[(][^\]\)]+[\])]|\s*[-–]?\s*(?:grade|grado)?\s*(?:no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?)?$/i.test(
      name
    ) ||
    /^(?:blessed\s+)?(?:beast\s+)?(?:soul|spirit)shot\b/i.test(name) ||
    /^elixir\s+of\s+(?:life|cp|mental\s+strength)\b/i.test(name)
  );
}

/**
 * Ensures grade-differentiated items (Enchant/Recovery scrolls, base Crystals,
 * Soulshots/Spiritshots, Elixirs) and Soul Crystals (Stages 1–18 or grades)
 * preserve their grade or level inside `name` using `tags` when missing,
 * so different grades/stages never collapse into a single item.
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

    if (hasGradeInName(trimmed)) {
      return trimmed;
    }

    const gradeFromTag = extractGradeFromTags(cleanTags);
    if (gradeFromTag) {
      return `${trimmed} (${gradeFromTag})`;
    }

    return trimmed;
  }

  // 2. Grade-differentiated Scrolls, Crystals, Shots, Elixirs
  if (isGradeDifferentiatedItem(trimmed)) {
    const bracketOrBareGrade = trimmed.match(
      /^(.*?)\s*(?:\[\s*(?:(?:grade|grado)[-\s:]*)?(no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?\s*\]|\(\s*(no[-\s]?grade|ng|s84|s80|[sabcd])\s*\)|[-–]\s*(?:(?:grade|grado)[-\s:]*)?(no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?)$/i
    );
    if (bracketOrBareGrade) {
      const base = bracketOrBareGrade[1].trim();
      const rawGrade =
        bracketOrBareGrade[2] || bracketOrBareGrade[3] || bracketOrBareGrade[4];
      const formatted = rawGrade ? formatGradeToken(rawGrade) : null;
      if (base && formatted) {
        return `${base} (${formatted})`;
      }
    }

    if (hasGradeInName(trimmed)) {
      return trimmed;
    }

    const gradeFromTag = extractGradeFromTags(cleanTags);
    if (gradeFromTag) {
      return `${trimmed} (${gradeFromTag})`;
    }
  }

  return trimmed;
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
  return stripItemEnchantPrefix(name)
    .toLowerCase()
    .replace(
      /\(\s*(?:grade|grado)\s+(no[-\s]?grade|ng|s84|s80|[sabcd])\s*\)/g,
      (_, g: string) => {
        const clean = g.replace(/\s+/g, '-');
        return clean === 'ng' || clean === 'no-grade'
          ? '(no-grade)'
          : `(${clean}-grade)`;
      }
    )
    .replace(
      /\[\s*(?:grade|grado)?\s*(no[-\s]?grade|ng|s84|s80|[sabcd])(?:\s*-?\s*grade)?\s*\]/g,
      (_, g: string) => {
        const clean = g.replace(/\s+/g, '-');
        return clean === 'ng' || clean === 'no-grade'
          ? '(no-grade)'
          : `(${clean}-grade)`;
      }
    )
    .replace(/\(\s*(s84|s80|[sabcd])\s*\)/g, '($1-grade)')
    .replace(
      /(\bsoul\s+crystal)\s*(?:-|\(|\[)?\s*(?:stage|level|nivel|lv\.?|step)?\s*(1[0-8]|[1-9])\s*(?:\)|\])?$/g,
      '$1 - stage $2'
    );
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

export function loadDatabase(): L2Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const starter = createStarterDatabase();
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
      const starter = createStarterDatabase();
      saveDatabase(starter);
      return starter;
    }
    return {
      version: 1,
      characters: parsed.characters.map((c) => ({
        ...c,
        items: normalizeStoredItems(c.items),
      })),
      clans: parsed.clans.map((cl) => ({
        ...cl,
        items: normalizeStoredItems(cl.items),
      })),
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      iconBaseUrl:
        typeof parsed.iconBaseUrl === 'string' && parsed.iconBaseUrl.trim()
          ? parsed.iconBaseUrl
          : DEFAULT_ICON_BASE_URL,
      itemCatalog: normalizeItemCatalog(parsed.itemCatalog),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createStarterDatabase();
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
