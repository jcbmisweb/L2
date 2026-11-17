import {createStarterDatabase} from '../data/starterData';
import {ItemLocation, L2Database} from '../types/l2';

const STORAGE_KEY = 'l2es_vault_db_v1';

export const DEFAULT_ICON_BASE_URL = 'https://l2j.ru/img/icons/';

export function normalizeItemKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
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
      characters: parsed.characters,
      clans: parsed.clans,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      iconBaseUrl:
        typeof parsed.iconBaseUrl === 'string' && parsed.iconBaseUrl.trim()
          ? parsed.iconBaseUrl
          : DEFAULT_ICON_BASE_URL,
      itemCatalog:
        parsed.itemCatalog && typeof parsed.itemCatalog === 'object'
          ? parsed.itemCatalog
          : {},
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
