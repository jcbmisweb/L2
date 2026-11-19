import {ItemLocation, L2Database} from '../types/l2';
import {
  ItemGradeCategory,
  normalizeItemKey,
  stripGradeAndArmorFromItemName,
  stripItemEnchantPrefix,
} from '../utils/storage';

export type EpicCategory = 'necklace' | 'earring' | 'ring' | 'shirt';

export interface EpicJewelDef {
  id: string;
  name: string;
  subtitle?: string;
  category: EpicCategory;
  grade: ItemGradeCategory;
  aliases: string[];
  palette: {
    bg: string;
    primary: string;
    secondary: string;
    glow: string;
  };
  /** Optional variant suffix extractor (e.g. CP / HP / MP on Striped Mithril Shirt) */
  matchRegex?: RegExp;
}

export interface EpicJewelOwnerRow {
  ownerType: 'character' | 'clan';
  ownerId: string;
  ownerName: string;
  accountName: string | null;
  server: string;
  location: ItemLocation;
  itemName: string;
  enchant: number | null;
  variantLabel: string | null;
  quantity: number;
  isSealed: boolean;
  isCommon: boolean;
}

export interface EpicJewelAnalysis {
  def: EpicJewelDef;
  totalCount: number;
  owners: EpicJewelOwnerRow[];
  commonSkippedCount: number;
  catalogIconUrl: string | null;
}

export const EPIC_JEWELS_CATALOG: EpicJewelDef[] = [
  {
    id: 'epic::valakas-necklace',
    name: "Valakas' Necklace",
    category: 'necklace',
    grade: 'S',
    aliases: ["valakas' necklace", 'valakas necklace', 'necklace of valakas'],
    palette: {bg: '#2b1215', primary: '#ef4444', secondary: '#f59e0b', glow: '#fca5a5'},
  },
  {
    id: 'epic::antharas-earring',
    name: 'Earring of Antharas',
    category: 'earring',
    grade: 'S',
    aliases: ['earring of antharas', "antharas' earring", 'antharas earring'],
    palette: {bg: '#14261c', primary: '#94a3b8', secondary: '#10b981', glow: '#a7f3d0'},
  },
  {
    id: 'epic::baium-ring',
    name: 'Ring of Baium',
    category: 'ring',
    grade: 'S',
    aliases: ['ring of baium', "baium's ring", 'baium ring'],
    palette: {bg: '#261e14', primary: '#d97706', secondary: '#78716c', glow: '#fde68a'},
  },
  {
    id: 'epic::zaken-earring',
    name: "Zaken's Earring",
    category: 'earring',
    grade: 'S',
    aliases: ["zaken's earring", 'earring of zaken', 'zaken earring'],
    palette: {bg: '#131d2b', primary: '#94a3b8', secondary: '#f97316', glow: '#fdba74'},
  },
  {
    id: 'epic::blessed-zaken-earring',
    name: "Zaken's Earring Immortality",
    subtitle: 'Blessed Earring of Zaken',
    category: 'earring',
    grade: 'S84',
    aliases: [
      'blessed earring of zaken',
      "blessed zaken's earring",
      "zaken's earring immortality",
      "zaken's earring inmortality",
      'earring of zaken immortality',
      'earring of zaken inmortality',
      'zaken earring immortality',
    ],
    palette: {bg: '#152033', primary: '#cbd5e1', secondary: '#fbbf24', glow: '#fef08a'},
  },
  {
    id: 'epic::beleth-ring',
    name: "Beleth's Ring",
    category: 'ring',
    grade: 'S84',
    aliases: ["beleth's ring", "beleth' ring", 'beleth ring', 'ring of beleth'],
    palette: {bg: '#231f16', primary: '#e2e8f0', secondary: '#eab308', glow: '#fef3c7'},
  },
  {
    id: 'epic::blessed-freya-necklace',
    name: 'Blessed Freya Necklace',
    subtitle: 'Blessed Necklace of Freya',
    category: 'necklace',
    grade: 'S84',
    aliases: [
      'blessed freya necklace',
      "blessed freya's necklace",
      'blessed necklace of freya',
    ],
    palette: {bg: '#0f1f3d', primary: '#3b82f6', secondary: '#e2e8f0', glow: '#93c5fd'},
  },
  {
    id: 'epic::freya-necklace',
    name: 'Freya Necklace',
    subtitle: 'Necklace of Freya',
    category: 'necklace',
    grade: 'S84',
    aliases: ['freya necklace', "freya's necklace", 'necklace of freya'],
    palette: {bg: '#161f33', primary: '#60a5fa', secondary: '#cbd5e1', glow: '#bae6fd'},
  },
  {
    id: 'epic::frintezza-necklace',
    name: "Frintezza's Necklace",
    category: 'necklace',
    grade: 'A',
    aliases: [
      "frintezza's necklace",
      'necklace of frintezza',
      'frintezza necklace',
    ],
    palette: {bg: '#2b1318', primary: '#dc2626', secondary: '#a8a29e', glow: '#fca5a5'},
  },
  {
    id: 'epic::queen-ant-ring',
    name: 'Ring of Queen Ant',
    category: 'ring',
    grade: 'B',
    aliases: ['ring of queen ant', "queen ant's ring", 'queen ant ring'],
    palette: {bg: '#23172b', primary: '#a855f7', secondary: '#64748b', glow: '#e9d5ff'},
  },
  {
    id: 'epic::orfen-earring',
    name: "Orfen's Earring",
    category: 'earring',
    grade: 'B',
    aliases: ["orfen's earring", 'earring of orfen', 'orfen earring'],
    palette: {bg: '#162426', primary: '#2dd4bf', secondary: '#64748b', glow: '#99f6e4'},
  },
  {
    id: 'epic::core-ring',
    name: 'Ring of Core',
    category: 'ring',
    grade: 'B',
    aliases: ['ring of core', "core's ring", 'core ring'],
    palette: {bg: '#17202b', primary: '#38bdf8', secondary: '#64748b', glow: '#bae6fd'},
  },
  {
    id: 'epic::striped-mithril-shirt',
    name: 'Striped Mithril Shirt',
    subtitle: 'CP / HP / MP',
    category: 'shirt',
    grade: 'S',
    aliases: [
      'striped mithril shirt',
      'striped mithril shirt cp',
      'striped mithril shirt - cp',
      'striped mithril shirt hp',
      'striped mithril shirt - hp',
      'striped mithril shirt mp',
      'striped mithril shirt - mp',
    ],
    matchRegex: /^striped\s+mithril\s+shirt(?:\s*[-–:]?\s*(cp|hp|mp))?$/i,
    palette: {bg: '#112229', primary: '#cbd5e1', secondary: '#0ea5e9', glow: '#e0f2fe'},
  },
];

function extractEnchantPrefix(rawName: string): number | null {
  const m = rawName.trim().match(/^\+\s*(\d+)\s+/);
  return m ? Number(m[1]) : null;
}

function normalizeEpicCandidate(rawName: string): {
  baseName: string;
  isSealed: boolean;
  isCommon: boolean;
} {
  let current = stripGradeAndArmorFromItemName(rawName.trim());
  let isCommon = /\bcommon\s+item\b/i.test(rawName);
  let isSealed = /\bsealed\b/i.test(rawName);

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
    if (prev === current) break;
  }

  current = stripGradeAndArmorFromItemName(current).trim();

  return {
    baseName: current.toLowerCase().replace(/\s+/g, ' '),
    isSealed,
    isCommon,
  };
}

export interface AnalyzeEpicsOptions {
  selectedServer: string;
  includeCommon: boolean;
  includeSealed: boolean;
}

export function analyzeEpicJewels(
  db: L2Database,
  options: AnalyzeEpicsOptions
): EpicJewelAnalysis[] {
  const {selectedServer, includeCommon, includeSealed} = options;

  const findCatalogIcon = (def: EpicJewelDef): string | null => {
    const candidates = [def.name, ...def.aliases];
    for (const cand of candidates) {
      const entry = db.itemCatalog?.[normalizeItemKey(cand)];
      if (entry?.icon) return entry.icon;
    }
    return null;
  };

  const resultsMap = new Map<string, EpicJewelAnalysis>();
  EPIC_JEWELS_CATALOG.forEach((def) => {
    resultsMap.set(def.id, {
      def,
      totalCount: 0,
      owners: [],
      commonSkippedCount: 0,
      catalogIconUrl: findCatalogIcon(def),
    });
  });

  const inspectItem = (
    ownerType: 'character' | 'clan',
    ownerId: string,
    ownerName: string,
    accountName: string | null,
    server: string,
    location: ItemLocation,
    itemName: string,
    quantity: number | null
  ) => {
    const qty =
      typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0
        ? Math.floor(quantity)
        : 1;
    const enchant = extractEnchantPrefix(itemName);
    const {baseName, isSealed, isCommon} = normalizeEpicCandidate(itemName);

    for (const def of EPIC_JEWELS_CATALOG) {
      let matched = def.aliases.includes(baseName);
      let variantLabel: string | null = null;

      if (!matched && def.matchRegex) {
        const rx = baseName.match(def.matchRegex);
        if (rx) {
          matched = true;
          if (rx[1]) variantLabel = rx[1].toUpperCase();
        }
      } else if (matched && def.category === 'shirt') {
        const varMatch = baseName.match(/\b(cp|hp|mp)\b/i);
        if (varMatch) variantLabel = varMatch[1].toUpperCase();
      }

      if (!matched) continue;

      const entry = resultsMap.get(def.id)!;
      if (isCommon && !includeCommon) {
        entry.commonSkippedCount += qty;
        return;
      }
      if (isSealed && !includeSealed) {
        return;
      }

      entry.totalCount += qty;
      entry.owners.push({
        ownerType,
        ownerId,
        ownerName,
        accountName,
        server,
        location,
        itemName,
        enchant,
        variantLabel,
        quantity: qty,
        isSealed,
        isCommon,
      });
      return;
    }
  };

  db.characters.forEach((char) => {
    if (selectedServer !== 'all' && char.server !== selectedServer) return;
    char.items.forEach((it) =>
      inspectItem(
        'character',
        char.id,
        char.character.name,
        char.account,
        char.server,
        it.location,
        it.name,
        it.quantity
      )
    );
  });

  db.clans.forEach((clan) => {
    if (selectedServer !== 'all' && clan.server !== selectedServer) return;
    clan.items.forEach((it) =>
      inspectItem(
        'clan',
        clan.id,
        clan.name,
        null,
        clan.server,
        it.location,
        it.name,
        it.quantity
      )
    );
  });

  resultsMap.forEach((entry) => {
    entry.owners.sort((a, b) => {
      if ((a.enchant ?? 0) !== (b.enchant ?? 0)) {
        return (b.enchant ?? 0) - (a.enchant ?? 0);
      }
      if (a.location === 'equipped' && b.location !== 'equipped') return -1;
      if (b.location === 'equipped' && a.location !== 'equipped') return 1;
      return a.ownerName.localeCompare(b.ownerName);
    });
  });

  return Array.from(resultsMap.values());
}
