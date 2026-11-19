import {ItemLocation, L2Database} from '../types/l2';
import {
  ItemArmorType,
  ItemGradeCategory,
  extractItemArmorType,
  extractItemGradeCategory,
  stripGradeAndArmorFromItemName,
  stripItemEnchantPrefix,
} from '../utils/storage';

export type ArmorSlotKey = 'helmet' | 'chest' | 'legs' | 'gloves' | 'boots';

export interface ArmorPieceSlotDef {
  slot: ArmorSlotKey;
  label: string;
  names: string[];
  sharedArmorType?: boolean;
}

export interface ArmorPalette {
  primary: string;
  secondary: string;
  accent: string;
  trim: string;
}

export interface ArmorSetDef {
  id: string;
  family: string;
  name: string;
  grade: ItemGradeCategory;
  armorType: ItemArmorType;
  palette: ArmorPalette;
  pieces: ArmorPieceSlotDef[];
}

export interface ArmorPieceOccurrence {
  ownerType: 'character' | 'clan';
  ownerId: string;
  ownerName: string;
  accountName: string | null;
  server: string;
  location: ItemLocation;
  itemName: string;
  isSealed: boolean;
  isCommon: boolean;
  remainingQty: number;
  totalQty: number;
  armorType: ItemArmorType | null;
  grade: ItemGradeCategory | null;
}

export interface CompleteSetOwnerEntry {
  ownerType: 'character' | 'clan';
  ownerId: string;
  ownerName: string;
  accountName: string | null;
  server: string;
  count: number;
  hasSealed: boolean;
  hasCommon: boolean;
}

export interface LooseSlotSummary {
  slot: ArmorSlotKey;
  label: string;
  canonicalName: string;
  totalQty: number;
  occurrences: ArmorPieceOccurrence[];
}

export interface ArmorSetAnalysis {
  set: ArmorSetDef;
  completeCount: number;
  completeOwners: CompleteSetOwnerEntry[];
  looseSlots: LooseSlotSummary[];
  totalLoosePieces: number;
  assemblableExtraCount: number;
  commonSkippedCount: number;
  sealedIncludedCount: number;
}

export const GRADE_ORDER: ItemGradeCategory[] = [
  'S84',
  'S80',
  'S',
  'A',
  'B',
  'C',
  'D',
  'No-Grade',
];

export const GRADE_LABELS_ES: Record<ItemGradeCategory, string> = {
  S84: 'Grado S84',
  S80: 'Grado S80',
  S: 'Grado S',
  A: 'Grado A',
  B: 'Grado B',
  C: 'Grado C',
  D: 'Grado D',
  'No-Grade': 'Sin Grado (NG)',
};

const p = (
  slot: ArmorSlotKey,
  label: string,
  names: string | string[],
  sharedArmorType = false
): ArmorPieceSlotDef => ({
  slot,
  label,
  names: Array.isArray(names) ? names : [names],
  sharedArmorType,
});

export const ARMOR_SETS_CATALOG: ArmorSetDef[] = [
  // ==================== S84 GRADE ====================
  {
    id: 's84::elegia::heavy',
    family: 'Elegia',
    name: 'Elegia Heavy',
    grade: 'S84',
    armorType: 'Heavy Armor',
    palette: {primary: '#d8cfc0', secondary: '#5e6b78', accent: '#eab308', trim: '#f8fafc'},
    pieces: [
      p('helmet', 'Casco', 'Elegia Helmet'),
      p('chest', 'Pechera', 'Elegia Breastplate'),
      p('legs', 'Pantalón', 'Elegia Gaiters'),
      p('gloves', 'Guantes', 'Elegia Gauntlets'),
      p('boots', 'Botas', 'Elegia Boots'),
    ],
  },
  {
    id: 's84::elegia::light',
    family: 'Elegia',
    name: 'Elegia Light',
    grade: 'S84',
    armorType: 'Light Armor',
    palette: {primary: '#c9c4b8', secondary: '#4d5b54', accent: '#f59e0b', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Elegia Leather Helmet'),
      p('chest', 'Pechera', 'Elegia Leather Breastplate'),
      p('legs', 'Pantalón', 'Elegia Leather Leggings'),
      p('gloves', 'Guantes', 'Elegia Leather Gloves'),
      p('boots', 'Botas', 'Elegia Leather Boots'),
    ],
  },
  {
    id: 's84::elegia::robe',
    family: 'Elegia',
    name: 'Elegia Robe',
    grade: 'S84',
    armorType: 'Robe',
    palette: {primary: '#e2e8f0', secondary: '#2f6f6d', accent: '#fbbf24', trim: '#ffffff'},
    pieces: [
      p('helmet', 'Casco', 'Elegia Circlet'),
      p('chest', 'Túnica', 'Elegia Tunic'),
      p('legs', 'Pantalón', 'Elegia Stockings'),
      p('gloves', 'Guantes', 'Elegia Gloves'),
      p('boots', 'Botas', ['Elegia Shoes', 'Elegia Boots']),
    ],
  },

  {
    id: 's84::vorpal::heavy',
    family: 'Vorpal',
    name: 'Vorpal Heavy',
    grade: 'S84',
    armorType: 'Heavy Armor',
    palette: {primary: '#3f3f46', secondary: '#7c2d12', accent: '#f97316', trim: '#d4d4d8'},
    pieces: [
      p('helmet', 'Casco', 'Vorpal Helmet'),
      p('chest', 'Pechera', 'Vorpal Breastplate'),
      p('legs', 'Pantalón', 'Vorpal Gaiters'),
      p('gloves', 'Guantes', 'Vorpal Gauntlets'),
      p('boots', 'Botas', 'Vorpal Boots'),
    ],
  },
  {
    id: 's84::vorpal::light',
    family: 'Vorpal',
    name: 'Vorpal Light',
    grade: 'S84',
    armorType: 'Light Armor',
    palette: {primary: '#4b5563', secondary: '#7f1d1d', accent: '#fb923c', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Vorpal Leather Helmet'),
      p('chest', 'Pechera', 'Vorpal Leather Breastplate'),
      p('legs', 'Pantalón', 'Vorpal Leather Leggings'),
      p('gloves', 'Guantes', 'Vorpal Leather Gloves'),
      p('boots', 'Botas', 'Vorpal Leather Boots'),
    ],
  },
  {
    id: 's84::vorpal::robe',
    family: 'Vorpal',
    name: 'Vorpal Robe',
    grade: 'S84',
    armorType: 'Robe',
    palette: {primary: '#27272a', secondary: '#991b1b', accent: '#f59e0b', trim: '#fca5a5'},
    pieces: [
      p('helmet', 'Casco', 'Vorpal Circlet'),
      p('chest', 'Túnica', 'Vorpal Tunic'),
      p('legs', 'Pantalón', 'Vorpal Stockings'),
      p('gloves', 'Guantes', 'Vorpal Gloves'),
      p('boots', 'Botas', ['Vorpal Shoes', 'Vorpal Boots']),
    ],
  },

  {
    id: 's84::vesper-noble::heavy',
    family: 'Vesper Noble',
    name: 'Vesper Noble Heavy',
    grade: 'S84',
    armorType: 'Heavy Armor',
    palette: {primary: '#312e81', secondary: '#64748b', accent: '#facc15', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', ['Vesper Noble Helmet', 'Vesper Helmet']),
      p('chest', 'Pechera', 'Vesper Noble Breastplate'),
      p('legs', 'Pantalón', ['Vesper Noble Gaiters', 'Vesper Gaiters']),
      p('gloves', 'Guantes', ['Vesper Noble Gauntlets', 'Vesper Gauntlets']),
      p('boots', 'Botas', ['Vesper Noble Boots', 'Vesper Boots']),
    ],
  },
  {
    id: 's84::vesper-noble::light',
    family: 'Vesper Noble',
    name: 'Vesper Noble Light',
    grade: 'S84',
    armorType: 'Light Armor',
    palette: {primary: '#334155', secondary: '#4c1d95', accent: '#fde047', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', ['Vesper Noble Leather Helmet', 'Vesper Leather Helmet']),
      p('chest', 'Pechera', 'Vesper Noble Leather Breastplate'),
      p('legs', 'Pantalón', ['Vesper Noble Leather Leggings', 'Vesper Leather Leggings']),
      p('gloves', 'Guantes', ['Vesper Noble Leather Gloves', 'Vesper Leather Gloves']),
      p('boots', 'Botas', ['Vesper Noble Leather Boots', 'Vesper Leather Boots']),
    ],
  },
  {
    id: 's84::vesper-noble::robe',
    family: 'Vesper Noble',
    name: 'Vesper Noble Robe',
    grade: 'S84',
    armorType: 'Robe',
    palette: {primary: '#1e1b4b', secondary: '#6d28d9', accent: '#fbbf24', trim: '#e0e7ff'},
    pieces: [
      p('helmet', 'Casco', ['Vesper Noble Circlet', 'Vesper Circlet']),
      p('chest', 'Túnica', 'Vesper Noble Tunic'),
      p('legs', 'Pantalón', ['Vesper Noble Stockings', 'Vesper Stockings']),
      p('gloves', 'Guantes', ['Vesper Noble Gloves', 'Vesper Gloves']),
      p('boots', 'Botas', ['Vesper Noble Shoes', 'Vesper Shoes', 'Vesper Noble Boots', 'Vesper Boots']),
    ],
  },

  {
    id: 's84::vesper::heavy',
    family: 'Vesper',
    name: 'Vesper Heavy',
    grade: 'S84',
    armorType: 'Heavy Armor',
    palette: {primary: '#3f3b52', secondary: '#475569', accent: '#c084fc', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Vesper Helmet'),
      p('chest', 'Pechera', 'Vesper Breastplate'),
      p('legs', 'Pantalón', 'Vesper Gaiters'),
      p('gloves', 'Guantes', 'Vesper Gauntlets'),
      p('boots', 'Botas', 'Vesper Boots'),
    ],
  },
  {
    id: 's84::vesper::light',
    family: 'Vesper',
    name: 'Vesper Light',
    grade: 'S84',
    armorType: 'Light Armor',
    palette: {primary: '#374151', secondary: '#581c87', accent: '#a855f7', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Vesper Leather Helmet'),
      p('chest', 'Pechera', 'Vesper Leather Breastplate'),
      p('legs', 'Pantalón', 'Vesper Leather Leggings'),
      p('gloves', 'Guantes', 'Vesper Leather Gloves'),
      p('boots', 'Botas', 'Vesper Leather Boots'),
    ],
  },
  {
    id: 's84::vesper::robe',
    family: 'Vesper',
    name: 'Vesper Robe',
    grade: 'S84',
    armorType: 'Robe',
    palette: {primary: '#1f2937', secondary: '#4c1d95', accent: '#c084fc', trim: '#ddd6fe'},
    pieces: [
      p('helmet', 'Casco', 'Vesper Circlet'),
      p('chest', 'Túnica', 'Vesper Tunic'),
      p('legs', 'Pantalón', 'Vesper Stockings'),
      p('gloves', 'Guantes', 'Vesper Gloves'),
      p('boots', 'Botas', ['Vesper Shoes', 'Vesper Boots']),
    ],
  },

  // ==================== S80 GRADE ====================
  {
    id: 's80::moirai::heavy',
    family: 'Moirai',
    name: 'Moirai Heavy',
    grade: 'S80',
    armorType: 'Heavy Armor',
    palette: {primary: '#1f2937', secondary: '#334155', accent: '#f59e0b', trim: '#94a3b8'},
    pieces: [
      p('helmet', 'Casco', 'Moirai Helmet'),
      p('chest', 'Pechera', 'Moirai Breastplate'),
      p('legs', 'Pantalón', 'Moirai Gaiters'),
      p('gloves', 'Guantes', 'Moirai Gauntlets'),
      p('boots', 'Botas', 'Moirai Boots'),
    ],
  },
  {
    id: 's80::moirai::light',
    family: 'Moirai',
    name: 'Moirai Light',
    grade: 'S80',
    armorType: 'Light Armor',
    palette: {primary: '#262626', secondary: '#3f3f46', accent: '#eab308', trim: '#a1a1aa'},
    pieces: [
      p('helmet', 'Casco', 'Moirai Leather Helmet'),
      p('chest', 'Pechera', 'Moirai Leather Breastplate'),
      p('legs', 'Pantalón', 'Moirai Leather Leggings'),
      p('gloves', 'Guantes', 'Moirai Leather Gloves'),
      p('boots', 'Botas', 'Moirai Leather Boots'),
    ],
  },
  {
    id: 's80::moirai::robe',
    family: 'Moirai',
    name: 'Moirai Robe',
    grade: 'S80',
    armorType: 'Robe',
    palette: {primary: '#18181b', secondary: '#312e81', accent: '#fbbf24', trim: '#c7d2fe'},
    pieces: [
      p('helmet', 'Casco', 'Moirai Circlet'),
      p('chest', 'Túnica', 'Moirai Tunic'),
      p('legs', 'Pantalón', 'Moirai Stockings'),
      p('gloves', 'Guantes', 'Moirai Gloves'),
      p('boots', 'Botas', ['Moirai Shoes', 'Moirai Boots']),
    ],
  },

  // ==================== S GRADE ====================
  {
    id: 's::dynasty::heavy',
    family: 'Dynasty',
    name: 'Dynasty Heavy',
    grade: 'S',
    armorType: 'Heavy Armor',
    palette: {primary: '#e5e7eb', secondary: '#991b1b', accent: '#d97706', trim: '#ffffff'},
    pieces: [
      p('helmet', 'Casco', 'Dynasty Helmet'),
      p('chest', 'Pechera', ['Dynasty Breastplate', 'Dynasty Platinum Plate']),
      p('legs', 'Pantalón', 'Dynasty Gaiters'),
      p('gloves', 'Guantes', 'Dynasty Gauntlets'),
      p('boots', 'Botas', 'Dynasty Boots'),
    ],
  },
  {
    id: 's::dynasty::light',
    family: 'Dynasty',
    name: 'Dynasty Light',
    grade: 'S',
    armorType: 'Light Armor',
    palette: {primary: '#e2d9c8', secondary: '#881337', accent: '#f59e0b', trim: '#fef3c7'},
    pieces: [
      p('helmet', 'Casco', 'Dynasty Leather Helmet'),
      p('chest', 'Pechera', ['Dynasty Leather Armor', 'Dynasty Leather Mail']),
      p('legs', 'Pantalón', 'Dynasty Leather Leggings'),
      p('gloves', 'Guantes', 'Dynasty Leather Gloves'),
      p('boots', 'Botas', 'Dynasty Leather Boots'),
    ],
  },
  {
    id: 's::dynasty::robe',
    family: 'Dynasty',
    name: 'Dynasty Robe',
    grade: 'S',
    armorType: 'Robe',
    palette: {primary: '#f5f5f4', secondary: '#b91c1c', accent: '#eab308', trim: '#fde68a'},
    pieces: [
      p('helmet', 'Casco', 'Dynasty Circlet'),
      p('chest', 'Túnica', 'Dynasty Tunic'),
      p('legs', 'Pantalón', 'Dynasty Stockings'),
      p('gloves', 'Guantes', 'Dynasty Gloves'),
      p('boots', 'Botas', ['Dynasty Shoes', 'Dynasty Boots']),
    ],
  },
  {
    id: 's::imperial::heavy',
    family: 'Imperial Crusader / Draconic / Major Arcana',
    name: 'Imperial Crusader',
    grade: 'S',
    armorType: 'Heavy Armor',
    palette: {primary: '#cbd5e1', secondary: '#1e3a8a', accent: '#f59e0b', trim: '#fef08a'},
    pieces: [
      p('helmet', 'Casco', 'Imperial Crusader Helmet'),
      p('chest', 'Pechera', 'Imperial Crusader Breastplate'),
      p('legs', 'Pantalón', 'Imperial Crusader Gaiters'),
      p('gloves', 'Guantes', 'Imperial Crusader Gauntlets'),
      p('boots', 'Botas', 'Imperial Crusader Boots'),
    ],
  },
  {
    id: 's::draconic::light',
    family: 'Imperial Crusader / Draconic / Major Arcana',
    name: 'Draconic Leather',
    grade: 'S',
    armorType: 'Light Armor',
    palette: {primary: '#292524', secondary: '#b91c1c', accent: '#ef4444', trim: '#fca5a5'},
    pieces: [
      p('helmet', 'Casco', 'Draconic Leather Helmet'),
      p('chest', 'Pechera', 'Draconic Leather Armor'),
      p('gloves', 'Guantes', 'Draconic Leather Gloves'),
      p('boots', 'Botas', 'Draconic Leather Boots'),
    ],
  },
  {
    id: 's::major-arcana::robe',
    family: 'Imperial Crusader / Draconic / Major Arcana',
    name: 'Major Arcana',
    grade: 'S',
    armorType: 'Robe',
    palette: {primary: '#f1f5f9', secondary: '#1e40af', accent: '#38bdf8', trim: '#fde047'},
    pieces: [
      p('helmet', 'Casco', 'Major Arcana Circlet'),
      p('chest', 'Túnica', 'Major Arcana Robe'),
      p('gloves', 'Guantes', 'Major Arcana Gloves'),
      p('boots', 'Botas', 'Major Arcana Boots'),
    ],
  },

  // ==================== A GRADE ====================
  {
    id: 'a::majestic::heavy',
    family: 'Majestic',
    name: 'Majestic Heavy',
    grade: 'A',
    armorType: 'Heavy Armor',
    palette: {primary: '#f1f5f9', secondary: '#78716c', accent: '#eab308', trim: '#ffffff'},
    pieces: [
      p('helmet', 'Casco', 'Majestic Circlet', true),
      p('chest', 'Pechera', 'Majestic Plate Armor'),
      p('gloves', 'Guantes', 'Majestic Gauntlets'),
      p('boots', 'Botas', 'Majestic Boots'),
    ],
  },
  {
    id: 'a::majestic::light',
    family: 'Majestic',
    name: 'Majestic Light',
    grade: 'A',
    armorType: 'Light Armor',
    palette: {primary: '#e7e5e4', secondary: '#57534e', accent: '#f59e0b', trim: '#fef3c7'},
    pieces: [
      p('helmet', 'Casco', 'Majestic Circlet', true),
      p('chest', 'Pechera', 'Majestic Leather Armor'),
      p('gloves', 'Guantes', 'Majestic Gauntlets'),
      p('boots', 'Botas', 'Majestic Boots'),
    ],
  },
  {
    id: 'a::majestic::robe',
    family: 'Majestic',
    name: 'Majestic Robe',
    grade: 'A',
    armorType: 'Robe',
    palette: {primary: '#f8fafc', secondary: '#64748b', accent: '#fbbf24', trim: '#ffffff'},
    pieces: [
      p('helmet', 'Casco', 'Majestic Circlet', true),
      p('chest', 'Túnica', 'Majestic Robe'),
      p('gloves', 'Guantes', 'Majestic Gauntlets'),
      p('boots', 'Botas', 'Majestic Boots'),
    ],
  },

  {
    id: 'a::nightmare::heavy',
    family: 'Nightmare',
    name: 'Nightmare Heavy',
    grade: 'A',
    armorType: 'Heavy Armor',
    palette: {primary: '#1e293b', secondary: '#3f3f46', accent: '#e11d48', trim: '#94a3b8'},
    pieces: [
      p('helmet', 'Casco', 'Helm of Nightmare', true),
      p('chest', 'Pechera', 'Armor of Nightmare'),
      p('gloves', 'Guantes', 'Gauntlets of Nightmare'),
      p('boots', 'Botas', 'Boots of Nightmare'),
    ],
  },
  {
    id: 'a::nightmare::light',
    family: 'Nightmare',
    name: 'Nightmare Light',
    grade: 'A',
    armorType: 'Light Armor',
    palette: {primary: '#27272a', secondary: '#451a03', accent: '#f43f5e', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Helm of Nightmare', true),
      p('chest', 'Pechera', 'Leather Armor of Nightmare'),
      p('gloves', 'Guantes', 'Gauntlets of Nightmare'),
      p('boots', 'Botas', 'Boots of Nightmare'),
    ],
  },
  {
    id: 'a::nightmare::robe',
    family: 'Nightmare',
    name: 'Nightmare Robe',
    grade: 'A',
    armorType: 'Robe',
    palette: {primary: '#111827', secondary: '#581c87', accent: '#fb7185', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Helm of Nightmare', true),
      p('chest', 'Túnica', 'Robe of Nightmare'),
      p('gloves', 'Guantes', 'Gauntlets of Nightmare'),
      p('boots', 'Botas', 'Boots of Nightmare'),
    ],
  },

  {
    id: 'a::tallum::heavy',
    family: 'Tallum',
    name: 'Tallum Heavy',
    grade: 'A',
    armorType: 'Heavy Armor',
    palette: {primary: '#78716c', secondary: '#7f1d1d', accent: '#f59e0b', trim: '#e7e5e4'},
    pieces: [
      p('helmet', 'Casco', 'Tallum Helm', true),
      p('chest', 'Pechera', 'Tallum Plate Armor'),
      p('gloves', 'Guantes', 'Tallum Gloves'),
      p('boots', 'Botas', 'Tallum Boots'),
    ],
  },
  {
    id: 'a::tallum::light',
    family: 'Tallum',
    name: 'Tallum Light',
    grade: 'A',
    armorType: 'Light Armor',
    palette: {primary: '#57534e', secondary: '#881337', accent: '#fb923c', trim: '#d6d3d1'},
    pieces: [
      p('helmet', 'Casco', 'Tallum Helm', true),
      p('chest', 'Pechera', 'Tallum Leather Armor'),
      p('gloves', 'Guantes', 'Tallum Gloves'),
      p('boots', 'Botas', 'Tallum Boots'),
    ],
  },
  {
    id: 'a::tallum::robe',
    family: 'Tallum',
    name: 'Tallum Robe',
    grade: 'A',
    armorType: 'Robe',
    palette: {primary: '#44403c', secondary: '#991b1b', accent: '#fbbf24', trim: '#fed7aa'},
    pieces: [
      p('helmet', 'Casco', 'Tallum Helm', true),
      p('chest', 'Túnica', 'Tallum Tunic'),
      p('legs', 'Pantalón', 'Tallum Stockings'),
      p('gloves', 'Guantes', 'Tallum Gloves'),
      p('boots', 'Botas', 'Tallum Boots'),
    ],
  },

  {
    id: 'a::dark-crystal::heavy',
    family: 'Dark Crystal',
    name: 'Dark Crystal Heavy',
    grade: 'A',
    armorType: 'Heavy Armor',
    palette: {primary: '#0f172a', secondary: '#134e4a', accent: '#2dd4bf', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Dark Crystal Helmet', true),
      p('chest', 'Pechera', 'Dark Crystal Breastplate'),
      p('legs', 'Pantalón', 'Dark Crystal Gaiters'),
      p('gloves', 'Guantes', 'Dark Crystal Gloves'),
      p('boots', 'Botas', 'Dark Crystal Boots'),
    ],
  },
  {
    id: 'a::dark-crystal::light',
    family: 'Dark Crystal',
    name: 'Dark Crystal Light',
    grade: 'A',
    armorType: 'Light Armor',
    palette: {primary: '#1e293b', secondary: '#115e59', accent: '#14b8a6', trim: '#94a3b8'},
    pieces: [
      p('helmet', 'Casco', 'Dark Crystal Helmet', true),
      p('chest', 'Pechera', 'Dark Crystal Leather Armor'),
      p('legs', 'Pantalón', 'Dark Crystal Leggings'),
      p('gloves', 'Guantes', 'Dark Crystal Gloves'),
      p('boots', 'Botas', 'Dark Crystal Boots'),
    ],
  },
  {
    id: 'a::dark-crystal::robe',
    family: 'Dark Crystal',
    name: 'Dark Crystal Robe',
    grade: 'A',
    armorType: 'Robe',
    palette: {primary: '#0f172a', secondary: '#0d9488', accent: '#5eead4', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Dark Crystal Helmet', true),
      p('chest', 'Túnica', 'Dark Crystal Robe'),
      p('gloves', 'Guantes', 'Dark Crystal Gloves'),
      p('boots', 'Botas', 'Dark Crystal Boots'),
    ],
  },

  // ==================== B GRADE ====================
  {
    id: 'b::blue-wolf::heavy',
    family: 'Blue Wolf',
    name: 'Blue Wolf Heavy',
    grade: 'B',
    armorType: 'Heavy Armor',
    palette: {primary: '#475569', secondary: '#1e3a8a', accent: '#38bdf8', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Blue Wolf Helmet', true),
      p('chest', 'Pechera', 'Blue Wolf Breastplate'),
      p('legs', 'Pantalón', 'Blue Wolf Gaiters'),
      p('gloves', 'Guantes', 'Blue Wolf Gloves'),
      p('boots', 'Botas', 'Blue Wolf Boots'),
    ],
  },
  {
    id: 'b::blue-wolf::light',
    family: 'Blue Wolf',
    name: 'Blue Wolf Light',
    grade: 'B',
    armorType: 'Light Armor',
    palette: {primary: '#334155', secondary: '#1d4ed8', accent: '#60a5fa', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Blue Wolf Helmet', true),
      p('chest', 'Pechera', 'Blue Wolf Leather Armor'),
      p('gloves', 'Guantes', 'Blue Wolf Gloves'),
      p('boots', 'Botas', 'Blue Wolf Boots'),
    ],
  },
  {
    id: 'b::blue-wolf::robe',
    family: 'Blue Wolf',
    name: 'Blue Wolf Robe',
    grade: 'B',
    armorType: 'Robe',
    palette: {primary: '#1e293b', secondary: '#2563eb', accent: '#93c5fd', trim: '#f1f5f9'},
    pieces: [
      p('helmet', 'Casco', 'Blue Wolf Helmet', true),
      p('chest', 'Túnica', 'Blue Wolf Tunic'),
      p('legs', 'Pantalón', 'Blue Wolf Stockings'),
      p('gloves', 'Guantes', 'Blue Wolf Gloves'),
      p('boots', 'Botas', 'Blue Wolf Boots'),
    ],
  },

  {
    id: 'b::doom::heavy',
    family: 'Doom',
    name: 'Doom Heavy',
    grade: 'B',
    armorType: 'Heavy Armor',
    palette: {primary: '#27272a', secondary: '#7f1d1d', accent: '#ef4444', trim: '#a1a1aa'},
    pieces: [
      p('helmet', 'Casco', 'Doom Helmet', true),
      p('chest', 'Pechera', 'Doom Plate Armor'),
      p('gloves', 'Guantes', 'Doom Gloves'),
      p('boots', 'Botas', 'Doom Boots'),
    ],
  },
  {
    id: 'b::doom::light',
    family: 'Doom',
    name: 'Doom Light',
    grade: 'B',
    armorType: 'Light Armor',
    palette: {primary: '#3f3f46', secondary: '#991b1b', accent: '#f87171', trim: '#d4d4d8'},
    pieces: [
      p('helmet', 'Casco', 'Doom Helmet', true),
      p('chest', 'Pechera', 'Leather Armor of Doom'),
      p('gloves', 'Guantes', 'Doom Gloves'),
      p('boots', 'Botas', 'Doom Boots'),
    ],
  },
  {
    id: 'b::doom::robe',
    family: 'Doom',
    name: 'Doom Robe',
    grade: 'B',
    armorType: 'Robe',
    palette: {primary: '#18181b', secondary: '#881337', accent: '#fb7185', trim: '#e4e4e7'},
    pieces: [
      p('helmet', 'Casco', 'Doom Helmet', true),
      p('chest', 'Túnica', 'Tunic of Doom'),
      p('legs', 'Pantalón', 'Stockings of Doom'),
      p('gloves', 'Guantes', 'Doom Gloves'),
      p('boots', 'Botas', 'Doom Boots'),
    ],
  },

  {
    id: 'b::avadon::heavy',
    family: 'Avadon',
    name: 'Avadon Heavy',
    grade: 'B',
    armorType: 'Heavy Armor',
    palette: {primary: '#475569', secondary: '#065f46', accent: '#34d399', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Avadon Circlet', true),
      p('chest', 'Pechera', 'Avadon Breastplate'),
      p('legs', 'Pantalón', 'Avadon Gaiters'),
      p('gloves', 'Guantes', 'Avadon Gloves'),
      p('boots', 'Botas', 'Avadon Boots'),
    ],
  },
  {
    id: 'b::avadon::light',
    family: 'Avadon',
    name: 'Avadon Light',
    grade: 'B',
    armorType: 'Light Armor',
    palette: {primary: '#334155', secondary: '#047857', accent: '#10b981', trim: '#cbd5e1'},
    pieces: [
      p('helmet', 'Casco', 'Avadon Circlet', true),
      p('chest', 'Pechera', 'Avadon Leather Armor'),
      p('gloves', 'Guantes', 'Avadon Gloves'),
      p('boots', 'Botas', 'Avadon Boots'),
    ],
  },
  {
    id: 'b::avadon::robe',
    family: 'Avadon',
    name: 'Avadon Robe',
    grade: 'B',
    armorType: 'Robe',
    palette: {primary: '#334155', secondary: '#0f766e', accent: '#2dd4bf', trim: '#f8fafc'},
    pieces: [
      p('helmet', 'Casco', 'Avadon Circlet', true),
      p('chest', 'Túnica', 'Avadon Robe'),
      p('gloves', 'Guantes', 'Avadon Gloves'),
      p('boots', 'Botas', 'Avadon Boots'),
    ],
  },

  {
    id: 'b::zubei::heavy',
    family: 'Zubei',
    name: 'Zubei Heavy',
    grade: 'B',
    armorType: 'Heavy Armor',
    palette: {primary: '#94a3b8', secondary: '#334155', accent: '#fbbf24', trim: '#f8fafc'},
    pieces: [
      p('helmet', 'Casco', "Zubei's Helmet", true),
      p('chest', 'Pechera', "Zubei's Breastplate"),
      p('legs', 'Pantalón', "Zubei's Gaiters"),
      p('gloves', 'Guantes', "Zubei's Gauntlets"),
      p('boots', 'Botas', "Zubei's Boots"),
    ],
  },
  {
    id: 'b::zubei::light',
    family: 'Zubei',
    name: 'Zubei Light',
    grade: 'B',
    armorType: 'Light Armor',
    palette: {primary: '#64748b', secondary: '#475569', accent: '#f59e0b', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', "Zubei's Helmet", true),
      p('chest', 'Pechera', "Zubei's Leather Shirt"),
      p('legs', 'Pantalón', "Zubei's Leather Gaiters"),
      p('gloves', 'Guantes', "Zubei's Gauntlets"),
      p('boots', 'Botas', "Zubei's Boots"),
    ],
  },
  {
    id: 'b::zubei::robe',
    family: 'Zubei',
    name: 'Zubei Robe',
    grade: 'B',
    armorType: 'Robe',
    palette: {primary: '#e2e8f0', secondary: '#475569', accent: '#eab308', trim: '#ffffff'},
    pieces: [
      p('helmet', 'Casco', "Zubei's Helmet", true),
      p('chest', 'Túnica', 'Tunic of Zubei'),
      p('legs', 'Pantalón', 'Stockings of Zubei'),
      p('gloves', 'Guantes', "Zubei's Gauntlets"),
      p('boots', 'Botas', "Zubei's Boots"),
    ],
  },

  // ==================== C GRADE ====================
  {
    id: 'c::full-plate::heavy',
    family: 'Full Plate / Drake / Divine',
    name: 'Full Plate',
    grade: 'C',
    armorType: 'Heavy Armor',
    palette: {primary: '#9ca3af', secondary: '#4b5563', accent: '#38bdf8', trim: '#f3f4f6'},
    pieces: [
      p('helmet', 'Casco', 'Full Plate Helmet'),
      p('chest', 'Pechera', 'Full Plate Armor'),
      p('gloves', 'Guantes', 'Full Plate Gauntlets'),
      p('boots', 'Botas', 'Full Plate Boots'),
    ],
  },
  {
    id: 'c::drake::light',
    family: 'Full Plate / Drake / Divine',
    name: 'Drake Leather',
    grade: 'C',
    armorType: 'Light Armor',
    palette: {primary: '#1e3a2f', secondary: '#4d7c0f', accent: '#a3e635', trim: '#d9f99d'},
    pieces: [
      p('chest', 'Pechera', 'Drake Leather Armor'),
      p('boots', 'Botas', 'Drake Leather Boots'),
    ],
  },
  {
    id: 'c::divine::robe',
    family: 'Full Plate / Drake / Divine',
    name: 'Divine Robe',
    grade: 'C',
    armorType: 'Robe',
    palette: {primary: '#f8fafc', secondary: '#0284c7', accent: '#38bdf8', trim: '#ffffff'},
    pieces: [
      p('chest', 'Túnica', 'Divine Tunic'),
      p('legs', 'Pantalón', 'Divine Stockings'),
      p('gloves', 'Guantes', 'Divine Gloves'),
      p('boots', 'Botas', 'Divine Boots'),
    ],
  },

  {
    id: 'c::composite::heavy',
    family: 'Composite / Theca / Demon',
    name: 'Composite Heavy',
    grade: 'C',
    armorType: 'Heavy Armor',
    palette: {primary: '#64748b', secondary: '#334155', accent: '#f59e0b', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Composite Helmet'),
      p('chest', 'Pechera', 'Composite Armor'),
      p('boots', 'Botas', 'Composite Boots'),
    ],
  },
  {
    id: 'c::theca::light',
    family: 'Composite / Theca / Demon',
    name: 'Theca Leather',
    grade: 'C',
    armorType: 'Light Armor',
    palette: {primary: '#78350f', secondary: '#451a03', accent: '#fbbf24', trim: '#fde68a'},
    pieces: [
      p('chest', 'Pechera', 'Theca Leather Armor'),
      p('legs', 'Pantalón', 'Theca Leather Gaiters'),
      p('gloves', 'Guantes', 'Theca Leather Gloves'),
      p('boots', 'Botas', 'Theca Leather Boots'),
    ],
  },
  {
    id: 'c::demon::robe',
    family: 'Composite / Theca / Demon',
    name: "Demon's Robe",
    grade: 'C',
    armorType: 'Robe',
    palette: {primary: '#27272a', secondary: '#7f1d1d', accent: '#dc2626', trim: '#fca5a5'},
    pieces: [
      p('chest', 'Túnica', "Demon's Tunic"),
      p('legs', 'Pantalón', "Demon's Stockings"),
      p('gloves', 'Guantes', "Demon's Gloves"),
      p('boots', 'Botas', "Demon's Boots"),
    ],
  },

  {
    id: 'c::chain-mail::heavy',
    family: 'Chain Mail / Plated Leather / Karmian',
    name: 'Chain Mail',
    grade: 'C',
    armorType: 'Heavy Armor',
    palette: {primary: '#71717a', secondary: '#3f3f46', accent: '#94a3b8', trim: '#e4e4e7'},
    pieces: [
      p('helmet', 'Casco', 'Chain Hood'),
      p('chest', 'Pechera', 'Chain Mail Shirt'),
      p('legs', 'Pantalón', 'Chain Gaiters'),
      p('gloves', 'Guantes', 'Chain Gloves'),
      p('boots', 'Botas', 'Chain Boots'),
    ],
  },
  {
    id: 'c::plated-leather::light',
    family: 'Chain Mail / Plated Leather / Karmian',
    name: 'Plated Leather',
    grade: 'C',
    armorType: 'Light Armor',
    palette: {primary: '#7c2d12', secondary: '#3f3f46', accent: '#fb923c', trim: '#fed7aa'},
    pieces: [
      p('chest', 'Pechera', 'Plated Leather'),
      p('legs', 'Pantalón', 'Plated Leather Gaiters'),
      p('gloves', 'Guantes', 'Plated Leather Gloves'),
      p('boots', 'Botas', 'Plated Leather Boots'),
    ],
  },
  {
    id: 'c::karmian::robe',
    family: 'Chain Mail / Plated Leather / Karmian',
    name: 'Karmian Robe',
    grade: 'C',
    armorType: 'Robe',
    palette: {primary: '#312e81', secondary: '#1e1b4b', accent: '#818cf8', trim: '#e0e7ff'},
    pieces: [
      p('chest', 'Túnica', 'Karmian Tunic'),
      p('legs', 'Pantalón', 'Karmian Stockings'),
      p('gloves', 'Guantes', 'Karmian Gloves'),
      p('boots', 'Botas', 'Karmian Boots'),
    ],
  },

  // ==================== D GRADE ====================
  {
    id: 'd::brigandine::heavy',
    family: 'Brigandine / Manticore / Elven Mithril',
    name: 'Brigandine Heavy',
    grade: 'D',
    armorType: 'Heavy Armor',
    palette: {primary: '#52525b', secondary: '#78350f', accent: '#f59e0b', trim: '#d4d4d8'},
    pieces: [
      p('helmet', 'Casco', 'Brigandine Helmet'),
      p('chest', 'Pechera', 'Brigandine Tunic'),
      p('legs', 'Pantalón', 'Brigandine Gaiters'),
      p('gloves', 'Guantes', 'Brigandine Gauntlets'),
      p('boots', 'Botas', 'Brigandine Boots'),
    ],
  },
  {
    id: 'd::manticore::light',
    family: 'Brigandine / Manticore / Elven Mithril',
    name: 'Manticore Skin',
    grade: 'D',
    armorType: 'Light Armor',
    palette: {primary: '#4d7c0f', secondary: '#365314', accent: '#a3e635', trim: '#ecfccb'},
    pieces: [
      p('chest', 'Pechera', 'Manticore Skin Shirt'),
      p('legs', 'Pantalón', 'Manticore Skin Gaiters'),
      p('gloves', 'Guantes', 'Manticore Skin Gloves'),
      p('boots', 'Botas', 'Manticore Skin Boots'),
    ],
  },
  {
    id: 'd::elven-mithril::robe',
    family: 'Brigandine / Manticore / Elven Mithril',
    name: 'Elven Mithril Robe',
    grade: 'D',
    armorType: 'Robe',
    palette: {primary: '#cbd5e1', secondary: '#0f766e', accent: '#2dd4bf', trim: '#f8fafc'},
    pieces: [
      p('chest', 'Túnica', 'Elven Mithril Tunic'),
      p('legs', 'Pantalón', 'Elven Mithril Stockings'),
      p('gloves', 'Guantes', 'Elven Mithril Gloves'),
      p('boots', 'Botas', 'Elven Mithril Boots'),
    ],
  },

  {
    id: 'd::mithril::heavy',
    family: 'Mithril / Reinforced / Knowledge',
    name: 'Mithril Heavy',
    grade: 'D',
    armorType: 'Heavy Armor',
    palette: {primary: '#cbd5e1', secondary: '#475569', accent: '#38bdf8', trim: '#ffffff'},
    pieces: [
      p('chest', 'Pechera', 'Mithril Breastplate'),
      p('legs', 'Pantalón', 'Mithril Gaiters'),
      p('gloves', 'Guantes', 'Mithril Gloves'),
      p('boots', 'Botas', 'Mithril Boots'),
    ],
  },
  {
    id: 'd::reinforced::light',
    family: 'Mithril / Reinforced / Knowledge',
    name: 'Reinforced Leather',
    grade: 'D',
    armorType: 'Light Armor',
    palette: {primary: '#78350f', secondary: '#451a03', accent: '#d97706', trim: '#fde68a'},
    pieces: [
      p('chest', 'Pechera', 'Reinforced Leather Shirt'),
      p('legs', 'Pantalón', 'Reinforced Leather Gaiters'),
      p('gloves', 'Guantes', 'Reinforced Leather Gloves'),
      p('boots', 'Botas', 'Reinforced Leather Boots'),
    ],
  },
  {
    id: 'd::knowledge::robe',
    family: 'Mithril / Reinforced / Knowledge',
    name: 'Knowledge Robe',
    grade: 'D',
    armorType: 'Robe',
    palette: {primary: '#334155', secondary: '#1e40af', accent: '#60a5fa', trim: '#dbeafe'},
    pieces: [
      p('chest', 'Túnica', 'Tunic of Knowledge'),
      p('legs', 'Pantalón', 'Stockings of Knowledge'),
      p('gloves', 'Guantes', 'Gloves of Knowledge'),
      p('boots', 'Botas', 'Boots of Knowledge'),
    ],
  },

  {
    id: 'd::clan-oath::heavy',
    family: 'Clan Oath',
    name: 'Clan Oath Heavy',
    grade: 'D',
    armorType: 'Heavy Armor',
    palette: {primary: '#475569', secondary: '#1e293b', accent: '#f59e0b', trim: '#e2e8f0'},
    pieces: [
      p('helmet', 'Casco', 'Clan Oath Helm', true),
      p('chest', 'Pechera', 'Clan Oath Armor'),
      p('gloves', 'Guantes', 'Clan Oath Gauntlets'),
      p('boots', 'Botas', 'Clan Oath Sabaton'),
    ],
  },
  {
    id: 'd::clan-oath::light',
    family: 'Clan Oath',
    name: 'Clan Oath Light',
    grade: 'D',
    armorType: 'Light Armor',
    palette: {primary: '#57534e', secondary: '#292524', accent: '#fbbf24', trim: '#e7e5e4'},
    pieces: [
      p('helmet', 'Casco', 'Clan Oath Helm', true),
      p('chest', 'Pechera', 'Clan Oath Brigandine'),
      p('gloves', 'Guantes', 'Clan Oath Leather Gloves'),
      p('boots', 'Botas', 'Clan Oath Boots'),
    ],
  },
  {
    id: 'd::clan-oath::robe',
    family: 'Clan Oath',
    name: 'Clan Oath Robe',
    grade: 'D',
    armorType: 'Robe',
    palette: {primary: '#334155', secondary: '#1e3a8a', accent: '#93c5fd', trim: '#f1f5f9'},
    pieces: [
      p('helmet', 'Casco', 'Clan Oath Helm', true),
      p('chest', 'Túnica', 'Clan Oath Aketon'),
      p('gloves', 'Guantes', 'Clan Oath Padded Gloves'),
      p('boots', 'Botas', 'Clan Oath Sandals'),
    ],
  },

  // ==================== NO-GRADE ====================
  {
    id: 'ng::wooden::light',
    family: 'Inicial (Sin Grado)',
    name: 'Wooden Set',
    grade: 'No-Grade',
    armorType: 'Light Armor',
    palette: {primary: '#78350f', secondary: '#451a03', accent: '#d97706', trim: '#fef3c7'},
    pieces: [
      p('helmet', 'Casco', 'Wooden Helmet'),
      p('chest', 'Pechera', 'Wooden Breastplate'),
      p('legs', 'Pantalón', 'Wooden Gaiters'),
    ],
  },
  {
    id: 'ng::devotion::robe',
    family: 'Inicial (Sin Grado)',
    name: 'Devotion Set',
    grade: 'No-Grade',
    armorType: 'Robe',
    palette: {primary: '#475569', secondary: '#1e293b', accent: '#cbd5e1', trim: '#f8fafc'},
    pieces: [
      p('chest', 'Túnica', 'Tunic of Devotion'),
      p('legs', 'Pantalón', 'Stockings of Devotion'),
    ],
  },
];

function stripArmorNormalizationPrefixes(rawName: string): {
  baseName: string;
  isSealed: boolean;
  isCommon: boolean;
} {
  let current = stripGradeAndArmorFromItemName(rawName.trim());
  let isCommon = false;
  let isSealed = false;

  while (current) {
    const prev = current;
    const withoutEnchant = stripItemEnchantPrefix(current);
    if (withoutEnchant !== current) {
      if (/\bcommon\s+item\b/i.test(current)) isCommon = true;
      current = withoutEnchant;
      continue;
    }
    if (/^sealed\s+/i.test(current)) {
      isSealed = true;
      current = current.replace(/^sealed\s+/i, '').trim();
      continue;
    }
    if (/^(?:foundation|masterwork)\s+/i.test(current)) {
      current = current.replace(/^(?:foundation|masterwork)\s+/i, '').trim();
      continue;
    }
    if (prev === current) break;
  }

  if (/\bcommon\s+item\b/i.test(rawName)) isCommon = true;
  if (/\bsealed\b/i.test(rawName)) isSealed = true;

  current = stripGradeAndArmorFromItemName(current)
    .replace(/\s*\((?:foundation|masterwork|sealed)\)\s*$/i, '')
    .trim();

  return {
    baseName: current.toLowerCase().replace(/\s+/g, ' '),
    isSealed,
    isCommon,
  };
}

export interface AnalyzeArmorOptions {
  selectedServer: string;
  includeSealed: boolean;
  includeCommon: boolean;
}

export function analyzeArmorSets(
  db: L2Database,
  options: AnalyzeArmorOptions
): ArmorSetAnalysis[] {
  const {selectedServer, includeSealed, includeCommon} = options;

  // Build mutable pool of piece occurrences
  const occurrences: ArmorPieceOccurrence[] = [];

  const pushItem = (
    ownerType: 'character' | 'clan',
    ownerId: string,
    ownerName: string,
    accountName: string | null,
    server: string,
    location: ItemLocation,
    itemName: string,
    quantity: number | null,
    tags: string[]
  ) => {
    const qty =
      typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0
        ? Math.floor(quantity)
        : 1;
    const {isSealed, isCommon} = stripArmorNormalizationPrefixes(itemName);
    const armorType = extractItemArmorType(itemName, tags);
    const grade = extractItemGradeCategory(itemName, tags);

    occurrences.push({
      ownerType,
      ownerId,
      ownerName,
      accountName,
      server,
      location,
      itemName,
      isSealed,
      isCommon,
      remainingQty: qty,
      totalQty: qty,
      armorType,
      grade,
    });
  };

  db.characters.forEach((char) => {
    if (selectedServer !== 'all' && char.server !== selectedServer) return;
    char.items.forEach((it) =>
      pushItem(
        'character',
        char.id,
        char.character.name,
        char.account,
        char.server,
        it.location,
        it.name,
        it.quantity,
        it.tags
      )
    );
  });

  db.clans.forEach((clan) => {
    if (selectedServer !== 'all' && clan.server !== selectedServer) return;
    clan.items.forEach((it) =>
      pushItem(
        'clan',
        clan.id,
        clan.name,
        null,
        clan.server,
        it.location,
        it.name,
        it.quantity,
        it.tags
      )
    );
  });

  // Precompute normalized base names per occurrence
  const occBaseNames = occurrences.map(
    (occ) => stripArmorNormalizationPrefixes(occ.itemName).baseName
  );

  const canMatchSlot = (
    occIdx: number,
    set: ArmorSetDef,
    slotDef: ArmorPieceSlotDef
  ): boolean => {
    const occ = occurrences[occIdx];
    const base = occBaseNames[occIdx];
    const nameMatches = slotDef.names.some(
      (n) => n.toLowerCase() === base
    );
    if (!nameMatches) return false;

    // If item carries an explicit grade that contradicts the set's grade, skip
    if (occ.grade && occ.grade !== set.grade) {
      // Note: S80 vs S vs S84 are distinct; check exact match
      return false;
    }

    // If item carries an explicit armorType (e.g. Heavy Armor, Light Armor, Robe),
    // it MUST match this set's armorType!
    if (occ.armorType && occ.armorType !== set.armorType) {
      return false;
    }

    return true;
  };

  // Track skipped common count and sealed count per set
  const resultsMap = new Map<string, ArmorSetAnalysis>();
  ARMOR_SETS_CATALOG.forEach((set) => {
    resultsMap.set(set.id, {
      set,
      completeCount: 0,
      completeOwners: [],
      looseSlots: set.pieces.map((piece) => ({
        slot: piece.slot,
        label: piece.label,
        canonicalName: piece.names[0],
        totalQty: 0,
        occurrences: [],
      })),
      totalLoosePieces: 0,
      assemblableExtraCount: 0,
      commonSkippedCount: 0,
      sealedIncludedCount: 0,
    });
  });

  // Count skipped common items / sealed items accurately
  occurrences.forEach((occ, idx) => {
    ARMOR_SETS_CATALOG.forEach((set) => {
      const matched = set.pieces.some((slotDef) =>
        canMatchSlot(idx, set, slotDef)
      );
      if (!matched) return;
      const entry = resultsMap.get(set.id)!;
      if (occ.isCommon && !includeCommon) {
        entry.commonSkippedCount += occ.totalQty;
      }
      if (occ.isSealed && includeSealed && (!occ.isCommon || includeCommon)) {
        entry.sealedIncludedCount += occ.totalQty;
      }
    });
  });

  // Group eligible occurrences by ownerKey (`char::id` or `clan::id`)
  const ownerMap = new Map<string, number[]>();
  occurrences.forEach((occ, idx) => {
    if (occ.isCommon && !includeCommon) return;
    if (occ.isSealed && !includeSealed) return;
    const ownerKey = `${occ.ownerType}::${occ.ownerId}`;
    if (!ownerMap.has(ownerKey)) ownerMap.set(ownerKey, []);
    ownerMap.get(ownerKey)!.push(idx);
  });

  // Phase 1: Form complete sets per owner!
  // Score each (owner, set) pair so sets where the owner has the chest/exact armorType
  // get priority over shared-helmet alternatives (e.g. Mildret's Avadon Robe beats Avadon Heavy).
  ownerMap.forEach((occIndices) => {
    // Evaluate sets for this owner sorted by specificity (number of non-shared pieces matched)
    const setScores = ARMOR_SETS_CATALOG.map((set) => {
      let specificScore = 0;
      let totalMatchedSlots = 0;
      set.pieces.forEach((slotDef) => {
        const hasMatch = occIndices.some((idx) => canMatchSlot(idx, set, slotDef));
        if (hasMatch) {
          totalMatchedSlots++;
          const hasExactArmorMatch = occIndices.some(
            (idx) =>
              canMatchSlot(idx, set, slotDef) &&
              occurrences[idx].armorType === set.armorType
          );
          if (hasExactArmorMatch) specificScore += 10;
          if (!slotDef.sharedArmorType) specificScore += 5;
          if (slotDef.slot === 'chest') specificScore += 8;
        }
      });
      return {
        set,
        possibleComplete: totalMatchedSlots === set.pieces.length,
        specificScore,
      };
    })
      .filter((s) => s.possibleComplete)
      .sort((a, b) => b.specificScore - a.specificScore);

    for (const {set} of setScores) {
      // Greedily assemble as many complete sets as possible for this owner
      while (true) {
        const chosenIndices: number[] = [];
        let canComplete = true;

        for (const slotDef of set.pieces) {
          // Prefer non-sealed, non-common, equipped, exact armorType first
          const candidates = occIndices
            .filter(
              (idx) =>
                occurrences[idx].remainingQty > 0 &&
                canMatchSlot(idx, set, slotDef)
            )
            .sort((a, b) => {
              const oa = occurrences[a];
              const ob = occurrences[b];
              if (oa.isCommon !== ob.isCommon) return oa.isCommon ? 1 : -1;
              if (oa.isSealed !== ob.isSealed) return oa.isSealed ? 1 : -1;
              if ((oa.location === 'equipped') !== (ob.location === 'equipped')) {
                return oa.location === 'equipped' ? -1 : 1;
              }
              return 0;
            });

          if (candidates.length === 0) {
            canComplete = false;
            break;
          }
          chosenIndices.push(candidates[0]);
        }

        if (!canComplete) break;

        // Check we didn't somehow need 2 from the same occurrence when remainingQty === 1
        const usageCount = new Map<number, number>();
        let validQty = true;
        for (const idx of chosenIndices) {
          const nextUse = (usageCount.get(idx) || 0) + 1;
          if (nextUse > occurrences[idx].remainingQty) {
            validQty = false;
            break;
          }
          usageCount.set(idx, nextUse);
        }
        if (!validQty) break;

        let hasSealed = false;
        let hasCommon = false;
        for (const idx of chosenIndices) {
          occurrences[idx].remainingQty -= 1;
          if (occurrences[idx].isSealed) hasSealed = true;
          if (occurrences[idx].isCommon) hasCommon = true;
        }

        const sample = occurrences[chosenIndices[0]];
        const analysis = resultsMap.get(set.id)!;
        analysis.completeCount += 1;

        const existingOwner = analysis.completeOwners.find(
          (o) => o.ownerType === sample.ownerType && o.ownerId === sample.ownerId
        );
        if (existingOwner) {
          existingOwner.count += 1;
          existingOwner.hasSealed = existingOwner.hasSealed || hasSealed;
          existingOwner.hasCommon = existingOwner.hasCommon || hasCommon;
        } else {
          analysis.completeOwners.push({
            ownerType: sample.ownerType,
            ownerId: sample.ownerId,
            ownerName: sample.ownerName,
            accountName: sample.accountName,
            server: sample.server,
            count: 1,
            hasSealed,
            hasCommon,
          });
        }
      }
    }
  });

  // Phase 2: Collect remaining unconsumed pieces as loose pieces per set/slot!
  // For sharedArmorType items (e.g. Avadon Circlet without armorType) remaining loose,
  // avoid showing the exact same loose helmet 3x if only one variant of that family has other loose pieces,
  // OR show it clearly on matching sets without double-counting the global summary.
  occurrences.forEach((occ, idx) => {
    if (occ.remainingQty <= 0) return;
    if (occ.isCommon && !includeCommon) return;
    if (occ.isSealed && !includeSealed) return;

    // Find all matching (set, slotDef)
    const matches: {set: ArmorSetDef; slotIdx: number; isShared: boolean}[] = [];
    ARMOR_SETS_CATALOG.forEach((set) => {
      set.pieces.forEach((piece, slotIdx) => {
        if (canMatchSlot(idx, set, piece)) {
          matches.push({
            set,
            slotIdx,
            isShared: Boolean(piece.sharedArmorType) && !occ.armorType,
          });
        }
      });
    });

    if (matches.length === 0) return;

    // If an item matches exclusively non-shared sets, or only 1 set, attach directly.
    // If it's an untagged shared helmet (e.g. Avadon Circlet) matching 3 armor types (Heavy/Light/Robe),
    // prefer sets in that family that have other loose pieces or an owner match, otherwise attach to the 1st (Heavy)
    // so total loose pieces aren't inflated 3x.
    let targetMatches = matches.filter((m) => !m.isShared);
    if (targetMatches.length === 0) {
      // Check if any of the candidate sets has other pieces owned by the same owner or globally
      const withOtherPieces = matches.filter((m) => {
        const analysis = resultsMap.get(m.set.id)!;
        return (
          analysis.completeCount > 0 ||
          occurrences.some(
            (other, oIdx) =>
              oIdx !== idx &&
              other.remainingQty > 0 &&
              m.set.pieces.some(
                (p, sIdx) => sIdx !== m.slotIdx && canMatchSlot(oIdx, m.set, p)
              )
          )
        );
      });
      targetMatches =
        withOtherPieces.length > 0 ? [withOtherPieces[0]] : [matches[0]];
    }

    // Also ensure Vesper Noble shared fallback doesn't steal from Vesper unless it's explicitly Noble
    if (targetMatches.length > 1) {
      const nonNoble = targetMatches.filter(
        (m) => !m.set.family.includes('Noble')
      );
      if (nonNoble.length > 0 && !/\bnoble\b/i.test(occ.itemName)) {
        targetMatches = nonNoble;
      }
    }

    const chosen = targetMatches[0];
    const analysis = resultsMap.get(chosen.set.id)!;
    const slotSummary = analysis.looseSlots[chosen.slotIdx];
    slotSummary.totalQty += occ.remainingQty;
    slotSummary.occurrences.push({...occ});
  });

  // Finalize totals & assemblable-from-loose counts
  resultsMap.forEach((analysis) => {
    analysis.completeOwners.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.ownerName.localeCompare(b.ownerName);
    });

    analysis.totalLoosePieces = analysis.looseSlots.reduce(
      (sum, s) => sum + s.totalQty,
      0
    );

    if (analysis.looseSlots.length > 0) {
      analysis.assemblableExtraCount = Math.min(
        ...analysis.looseSlots.map((s) => s.totalQty)
      );
    }
  });

  return Array.from(resultsMap.values());
}
