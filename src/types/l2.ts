export type ItemLocation =
  | 'equipped'
  | 'inventory'
  | 'warehouse'
  | 'mail'
  | 'pets'
  | 'quests'
  | 'clan_warehouse';

export type EquipmentSlot =
  | 'hair_1'
  | 'helmet'
  | 'hair_2'
  | 'gloves'
  | 'chest'
  | 'boots'
  | 'cloak'
  | 'legs'
  | 'belt'
  | 'rhand'
  | 'lhand'
  | 'earring_1'
  | 'earring_2'
  | 'shirt'
  | 'ring_1'
  | 'ring_2'
  | 'necklace';

export type CaptureType = 'character' | 'clan_warehouse';

export interface ItemEntry {
  id: string;
  name: string;
  quantity: number | null;
  location: ItemLocation;
  slot?: EquipmentSlot | null;
  tags: string[];
  uncertain?: boolean;
}

export interface SubclassInfo {
  index: number;
  class: string | null;
  level: number | null;
  level_progress_pct: number | null;
  hp: number | null;
  mp: number | null;
  sp: number | null;
  creation_date: string | null;
}

export interface CharacterStats {
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  level_progress_pct: number | null;
  hp: number | null;
  mp: number | null;
  sp: number | null;
  hours_played: number | null;
  pvp: number | null;
  pk: number | null;
  karma: number | null;
  points?: number | null;
  noble: boolean | null;
  hero: boolean | null;
  online: boolean | null;
  location: string | null;
  creation_date?: string | null;
  last_access: string | null;
  last_disconnect?: string | null;
  subclasses?: SubclassInfo[];
}

export interface CharacterRecord {
  id: string; // `${server}::${account}::${name}`
  server: string;
  account: string;
  clan: string | null;
  status: 'captured' | 'pending';
  character: CharacterStats;
  items: ItemEntry[];
  updatedAt: string;
}

export interface ClanRecord {
  id: string; // `${server}::${name}`
  server: string;
  name: string;
  items: ItemEntry[];
  updatedAt: string;
}

export interface AccountMeta {
  id: string; // `${server}::${account}`
  server: string;
  account: string;
  email?: string | null;
  password?: string | null;
  ssn?: string | null;
  notes?: string | null;
  expectedCharacters?: number | null;
  creationDate?: string | null;
  lastAccess?: string | null;
  lastIp?: string | null;
}

export interface ItemCatalogEntry {
  key: string; // normalized lowercase trimmed item name
  name: string; // display name
  icon: string; // filename (e.g. "armor_helmet_i00.png") or full URL
  updatedAt: string;
}

export interface L2Database {
  version: 1;
  characters: CharacterRecord[];
  clans: ClanRecord[];
  accounts: AccountMeta[];
  iconBaseUrl: string;
  itemCatalog: Record<string, ItemCatalogEntry>;
  updatedAt: string;
}

export interface RawItemPayload {
  name: string | null;
  quantity: number | string | null;
  location: string;
  slot?: string | null;
  tags?: string[];
  uncertain?: boolean;
}

export interface RawCapturePayload {
  server: string;
  account?: string | null;
  clan?: string | null;
  capture_type: CaptureType;
  character?: Partial<CharacterStats> | null;
  items: RawItemPayload[];
  other_characters?: string[];
}

export type ImportMergeMode = 'replace_all' | 'merge_locations';

export interface ParsedPayloadPreview {
  index: number;
  payload: RawCapturePayload;
  normalizedItems: ItemEntry[];
  actionType:
    | 'create_character'
    | 'complete_pending_character'
    | 'update_character'
    | 'create_clan'
    | 'update_clan';
  targetId: string;
  targetLabel: string;
  server: string;
  account: string | null;
  clanName: string | null;
  existingItemCount: number;
  incomingItemCount: number;
  existingAdena: number;
  incomingAdena: number;
  uncertainCount: number;
  locationsPresent: ItemLocation[];
  otherCharactersDetected: string[];
  warnings: string[];
}

export interface ParseImportResult {
  ok: boolean;
  previews: ParsedPayloadPreview[];
  errors: string[];
}

export type ActiveView =
  | 'dashboard'
  | 'search'
  | 'bridge'
  | 'character'
  | 'clan'
  | 'catalog'
  | 'accounts'
  | 'account'
  | 'downloads'
  | 'professions';
