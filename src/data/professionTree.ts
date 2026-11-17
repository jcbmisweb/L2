import {CharacterRecord} from '../types/l2';

export interface ProfessionNode {
  id: string;
  name: string;
  tier: 0 | 1 | 2 | 3;
  aliases?: string[];
  children?: ProfessionNode[];
}

export interface ProfessionFamily {
  id: string;
  name: string;
  raceKeywords: string[];
  root: ProfessionNode;
}

export const PROFESSION_FAMILIES: ProfessionFamily[] = [
  {
    id: 'human_fighter',
    name: 'Human Fighter',
    raceKeywords: ['human', 'humano'],
    root: {
      id: 'human_fighter__root',
      name: 'Human Fighter',
      tier: 0,
      aliases: ['HumanFighter', 'Fighter'],
      children: [
        {
          id: 'human_fighter__warrior',
          name: 'Warrior',
          tier: 1,
          children: [
            {
              id: 'human_fighter__gladiator',
              name: 'Gladiator',
              tier: 2,
              children: [
                {id: 'human_fighter__duelist', name: 'Duelist', tier: 3},
              ],
            },
            {
              id: 'human_fighter__warlord',
              name: 'Warlord',
              tier: 2,
              children: [
                {id: 'human_fighter__dreadnought', name: 'Dreadnought', tier: 3},
              ],
            },
          ],
        },
        {
          id: 'human_fighter__knight',
          name: 'Knight',
          tier: 1,
          aliases: ['HumanKnight'],
          children: [
            {
              id: 'human_fighter__paladin',
              name: 'Paladin',
              tier: 2,
              children: [
                {
                  id: 'human_fighter__phoenixknight',
                  name: 'PhoenixKnight',
                  tier: 3,
                  aliases: ['Phoenix Knight'],
                },
              ],
            },
            {
              id: 'human_fighter__darkavenger',
              name: 'DarkAvenger',
              tier: 2,
              aliases: ['Dark Avenger'],
              children: [
                {
                  id: 'human_fighter__hellknight',
                  name: 'HellKnight',
                  tier: 3,
                  aliases: ['Hell Knight'],
                },
              ],
            },
          ],
        },
        {
          id: 'human_fighter__rogue',
          name: 'Rogue',
          tier: 1,
          children: [
            {
              id: 'human_fighter__treasurehunter',
              name: 'TreasureHunter',
              tier: 2,
              aliases: ['Treasure Hunter'],
              children: [
                {id: 'human_fighter__adventurer', name: 'Adventurer', tier: 3},
              ],
            },
            {
              id: 'human_fighter__hawkeye',
              name: 'Hawkeye',
              tier: 2,
              children: [
                {id: 'human_fighter__sagittarius', name: 'Sagittarius', tier: 3},
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'human_mage',
    name: 'Human Mage',
    raceKeywords: ['human', 'humano'],
    root: {
      id: 'human_mage__root',
      name: 'Human Mage',
      tier: 0,
      aliases: ['HumanMage', 'Human Mystic', 'Mystic'],
      children: [
        {
          id: 'human_mage__wizard',
          name: 'Wizard',
          tier: 1,
          aliases: ['HumanWizard'],
          children: [
            {
              id: 'human_mage__sorceror',
              name: 'Sorceror',
              tier: 2,
              aliases: ['Sorcerer'],
              children: [
                {id: 'human_mage__archmage', name: 'Archmage', tier: 3},
              ],
            },
            {
              id: 'human_mage__necromancer',
              name: 'Necromancer',
              tier: 2,
              children: [
                {id: 'human_mage__soultaker', name: 'Soultaker', tier: 3},
              ],
            },
            {
              id: 'human_mage__warlock',
              name: 'Warlock',
              tier: 2,
              children: [
                {
                  id: 'human_mage__arcanalord',
                  name: 'ArcanaLord',
                  tier: 3,
                  aliases: ['Arcana Lord'],
                },
              ],
            },
          ],
        },
        {
          id: 'human_mage__cleric',
          name: 'Cleric',
          tier: 1,
          children: [
            {
              id: 'human_mage__bishop',
              name: 'Bishop',
              tier: 2,
              children: [
                {id: 'human_mage__cardinal', name: 'Cardinal', tier: 3},
              ],
            },
            {
              id: 'human_mage__prophet',
              name: 'Prophet',
              tier: 2,
              children: [
                {id: 'human_mage__hierophant', name: 'Hierophant', tier: 3},
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'elf_fighter',
    name: 'Elf Fighter',
    raceKeywords: ['elf', 'elfo', 'elven'],
    root: {
      id: 'elf_fighter__root',
      name: 'Elf Fighter',
      tier: 0,
      aliases: ['ElfFighter', 'Elven Fighter'],
      children: [
        {
          id: 'elf_fighter__knight',
          name: 'Knight',
          tier: 1,
          aliases: ['ElvenKnight', 'Elven Knight'],
          children: [
            {
              id: 'elf_fighter__templeknight',
              name: 'TempleKnight',
              tier: 2,
              aliases: ['Temple Knight'],
              children: [
                {
                  id: 'elf_fighter__evatemplar',
                  name: 'EvaTemplar',
                  tier: 3,
                  aliases: ["Eva's Templar", 'Eva Templar', 'Evas Templar'],
                },
              ],
            },
            {
              id: 'elf_fighter__swordsinger',
              name: 'SwordSinger',
              tier: 2,
              aliases: ['Swordsinger', 'Sword Singer'],
              children: [
                {
                  id: 'elf_fighter__swordmuse',
                  name: 'SwordMuse',
                  tier: 3,
                  aliases: ['Sword Muse'],
                },
              ],
            },
          ],
        },
        {
          id: 'elf_fighter__scout',
          name: 'Scout',
          tier: 1,
          aliases: ['Elven Scout'],
          children: [
            {
              id: 'elf_fighter__plainswalker',
              name: 'PlainsWalker',
              tier: 2,
              aliases: ['Plains Walker', 'Plainswalker'],
              children: [
                {
                  id: 'elf_fighter__windrider',
                  name: 'WindRider',
                  tier: 3,
                  aliases: ['Wind Rider'],
                },
              ],
            },
            {
              id: 'elf_fighter__silverranger',
              name: 'SilverRanger',
              tier: 2,
              aliases: ['Silver Ranger'],
              children: [
                {
                  id: 'elf_fighter__moonlightsentinel',
                  name: 'MoonlightSentinel',
                  tier: 3,
                  aliases: ['Moonlight Sentinel'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'elf_mage',
    name: 'Elf Mage',
    raceKeywords: ['elf', 'elfo', 'elven'],
    root: {
      id: 'elf_mage__root',
      name: 'Elf Mage',
      tier: 0,
      aliases: ['ElfMage', 'Elven Mystic', 'Elven Mage'],
      children: [
        {
          id: 'elf_mage__wizard',
          name: 'Wizard',
          tier: 1,
          aliases: ['ElvenWizard', 'Elven Wizard'],
          children: [
            {
              id: 'elf_mage__spellsinger',
              name: 'SpellSinger',
              tier: 2,
              aliases: ['Spellsinger', 'Spell Singer'],
              children: [
                {
                  id: 'elf_mage__mysticmuse',
                  name: 'MysticMuse',
                  tier: 3,
                  aliases: ['Mystic Muse'],
                },
              ],
            },
            {
              id: 'elf_mage__elementalsummoner',
              name: 'ElementalSummoner',
              tier: 2,
              aliases: ['Elemental Summoner'],
              children: [
                {
                  id: 'elf_mage__elementalmaster',
                  name: 'ElementalMaster',
                  tier: 3,
                  aliases: ['Elemental Master'],
                },
              ],
            },
          ],
        },
        {
          id: 'elf_mage__oracle',
          name: 'Oracle',
          tier: 1,
          aliases: ['Elven Oracle'],
          children: [
            {
              id: 'elf_mage__elder',
              name: 'Elder',
              tier: 2,
              aliases: ['Elven Elder'],
              children: [
                {
                  id: 'elf_mage__evasaint',
                  name: 'EvaSaint',
                  tier: 3,
                  aliases: ["Eva's Saint", 'Eva Saint', 'Evas Saint'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'darkelf_fighter',
    name: 'DarkElf Fighter',
    raceKeywords: ['dark', 'oscuro', 'darkelf'],
    root: {
      id: 'darkelf_fighter__root',
      name: 'DarkElf Fighter',
      tier: 0,
      aliases: ['Dark Elf Fighter', 'DarkFighter'],
      children: [
        {
          id: 'darkelf_fighter__palusknight',
          name: 'PalusKnight',
          tier: 1,
          aliases: ['Palus Knight'],
          children: [
            {
              id: 'darkelf_fighter__shillienknight',
              name: 'ShillienKnight',
              tier: 2,
              aliases: ['Shillien Knight'],
              children: [
                {
                  id: 'darkelf_fighter__shillientemplar',
                  name: 'ShillienTemplar',
                  tier: 3,
                  aliases: ['Shillien Templar'],
                },
              ],
            },
            {
              id: 'darkelf_fighter__bladedancer',
              name: 'BladeDancer',
              tier: 2,
              aliases: ['Bladedancer', 'Blade Dancer'],
              children: [
                {
                  id: 'darkelf_fighter__spectraldancer',
                  name: 'SpectralDancer',
                  tier: 3,
                  aliases: ['Spectral Dancer'],
                },
              ],
            },
          ],
        },
        {
          id: 'darkelf_fighter__assassin',
          name: 'Assassin',
          tier: 1,
          children: [
            {
              id: 'darkelf_fighter__abysswalker',
              name: 'AbyssWalker',
              tier: 2,
              aliases: ['Abyss Walker'],
              children: [
                {
                  id: 'darkelf_fighter__ghosthunter',
                  name: 'GhostHunter',
                  tier: 3,
                  aliases: ['Ghost Hunter'],
                },
              ],
            },
            {
              id: 'darkelf_fighter__phantomranger',
              name: 'PhantomRanger',
              tier: 2,
              aliases: ['Phantom Ranger'],
              children: [
                {
                  id: 'darkelf_fighter__ghostsentinel',
                  name: 'GhostSentinel',
                  tier: 3,
                  aliases: ['Ghost Sentinel'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'darkelf_mage',
    name: 'DarkElf Mage',
    raceKeywords: ['dark', 'oscuro', 'darkelf'],
    root: {
      id: 'darkelf_mage__root',
      name: 'DarkElf Mage',
      tier: 0,
      aliases: ['Dark Elf Mage', 'Dark Mystic', 'Dark Elven Mystic'],
      children: [
        {
          id: 'darkelf_mage__darkwizard',
          name: 'DarkWizard',
          tier: 1,
          aliases: ['Dark Wizard'],
          children: [
            {
              id: 'darkelf_mage__spellhowler',
              name: 'Spellhowler',
              tier: 2,
              aliases: ['Spell Howler'],
              children: [
                {
                  id: 'darkelf_mage__stormscreamer',
                  name: 'StormScreamer',
                  tier: 3,
                  aliases: ['Storm Screamer'],
                },
              ],
            },
            {
              id: 'darkelf_mage__phantomsummoner',
              name: 'PhantomSummoner',
              tier: 2,
              aliases: ['Phantom Summoner'],
              children: [
                {
                  id: 'darkelf_mage__spectralmaster',
                  name: 'SpectralMaster',
                  tier: 3,
                  aliases: ['Spectral Master'],
                },
              ],
            },
          ],
        },
        {
          id: 'darkelf_mage__shillienoracle',
          name: 'ShillienOracle',
          tier: 1,
          aliases: ['Shillien Oracle'],
          children: [
            {
              id: 'darkelf_mage__shillienelder',
              name: 'ShillienElder',
              tier: 2,
              aliases: ['Shillien Elder'],
              children: [
                {
                  id: 'darkelf_mage__shilliensaint',
                  name: 'ShillienSaint',
                  tier: 3,
                  aliases: ['Shillien Saint'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'orc_fighter',
    name: 'Orc Fighter',
    raceKeywords: ['orc', 'orco'],
    root: {
      id: 'orc_fighter__root',
      name: 'Orc Fighter',
      tier: 0,
      aliases: ['OrcFighter'],
      children: [
        {
          id: 'orc_fighter__raider',
          name: 'Raider',
          tier: 1,
          aliases: ['Orc Raider'],
          children: [
            {
              id: 'orc_fighter__destroyer',
              name: 'Destroyer',
              tier: 2,
              children: [
                {id: 'orc_fighter__titan', name: 'Titan', tier: 3},
              ],
            },
          ],
        },
        {
          id: 'orc_fighter__monk',
          name: 'Monk',
          tier: 1,
          aliases: ['Orc Monk'],
          children: [
            {
              id: 'orc_fighter__tyrant',
              name: 'Tyrant',
              tier: 2,
              children: [
                {
                  id: 'orc_fighter__grandkhauatari',
                  name: 'GrandKhauatari',
                  tier: 3,
                  aliases: ['Grand Khavatari', 'Grand Khauatari', 'GrandKhavatari'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'orc_mage',
    name: 'Orc Mage',
    raceKeywords: ['orc', 'orco'],
    root: {
      id: 'orc_mage__root',
      name: 'Orc Mage',
      tier: 0,
      aliases: ['OrcMage', 'Orc Mystic'],
      children: [
        {
          id: 'orc_mage__shaman',
          name: 'Shaman',
          tier: 1,
          aliases: ['Orc Shaman'],
          children: [
            {
              id: 'orc_mage__overlord',
              name: 'Overlord',
              tier: 2,
              children: [
                {id: 'orc_mage__dominator', name: 'Dominator', tier: 3},
              ],
            },
            {
              id: 'orc_mage__warcryer',
              name: 'Warcryer',
              tier: 2,
              children: [
                {id: 'orc_mage__doomcryer', name: 'Doomcryer', tier: 3},
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'dwarf_fighter',
    name: 'Dwarf Fighter',
    raceKeywords: ['dwarf', 'enano', 'enana'],
    root: {
      id: 'dwarf_fighter__root',
      name: 'Dwarf Fighter',
      tier: 0,
      aliases: ['DwarfFighter', 'Dwarven Fighter'],
      children: [
        {
          id: 'dwarf_fighter__scavenger',
          name: 'Scavenger',
          tier: 1,
          children: [
            {
              id: 'dwarf_fighter__bountyhunter',
              name: 'BountyHunter',
              tier: 2,
              aliases: ['Bounty Hunter'],
              children: [
                {
                  id: 'dwarf_fighter__fortuneseeker',
                  name: 'FortuneSeeker',
                  tier: 3,
                  aliases: ['Fortune Seeker'],
                },
              ],
            },
          ],
        },
        {
          id: 'dwarf_fighter__artisan',
          name: 'Artisan',
          tier: 1,
          children: [
            {
              id: 'dwarf_fighter__warsmith',
              name: 'Warsmith',
              tier: 2,
              children: [
                {id: 'dwarf_fighter__maestro', name: 'Maestro', tier: 3},
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'kamael_male',
    name: 'Kamael Male Soldier',
    raceKeywords: ['kamael'],
    root: {
      id: 'kamael_male__root',
      name: 'Kamael Male Soldier',
      tier: 0,
      aliases: ['Male Soldier'],
      children: [
        {
          id: 'kamael_male__trooper',
          name: 'Trooper',
          tier: 1,
          children: [
            {
              id: 'kamael_male__berserker',
              name: 'Berserker',
              tier: 2,
              children: [
                {id: 'kamael_male__doombringer', name: 'Doombringer', tier: 3},
              ],
            },
            {
              id: 'kamael_male__soulbreaker',
              name: 'Soulbreaker',
              tier: 2,
              aliases: ['Soul Breaker', 'Male Soulbreaker'],
              children: [
                {
                  id: 'kamael_male__soulhound',
                  name: 'Soulhound',
                  tier: 3,
                  aliases: ['Soul Hound', 'Male Soulhound'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'kamael_female',
    name: 'Kamael Female Soldier',
    raceKeywords: ['kamael'],
    root: {
      id: 'kamael_female__root',
      name: 'Kamael Female Soldier',
      tier: 0,
      aliases: ['Female Soldier'],
      children: [
        {
          id: 'kamael_female__warder',
          name: 'Warder',
          tier: 1,
          children: [
            {
              id: 'kamael_female__soulbreaker',
              name: 'Soulbreaker',
              tier: 2,
              aliases: ['Female Soulbreaker'],
              children: [
                {
                  id: 'kamael_female__soulhound',
                  name: 'Soulhound',
                  tier: 3,
                  aliases: ['Female Soulhound'],
                },
              ],
            },
            {
              id: 'kamael_female__arbalester',
              name: 'Arbalester',
              tier: 2,
              children: [
                {id: 'kamael_female__trickster', name: 'Trickster', tier: 3},
              ],
            },
            {
              id: 'kamael_female__inspector',
              name: 'Inspector',
              tier: 2,
              children: [
                {id: 'kamael_female__judicator', name: 'Judicator', tier: 3},
              ],
            },
          ],
        },
      ],
    },
  },
];

export function normalizeProfessionKey(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/['’`\s_-]+/g, '')
    .trim();
}

interface FlatNodeRef {
  familyId: string;
  familyName: string;
  nodeId: string;
  nodeName: string;
  raceKeywords: string[];
  keys: string[];
}

const FLAT_NODES: FlatNodeRef[] = [];

function collectFlatNodes(family: ProfessionFamily, node: ProfessionNode) {
  const keys = [node.name, ...(node.aliases || [])].map(normalizeProfessionKey);
  FLAT_NODES.push({
    familyId: family.id,
    familyName: family.name,
    nodeId: node.id,
    nodeName: node.name,
    raceKeywords: family.raceKeywords,
    keys,
  });
  (node.children || []).forEach((child) => collectFlatNodes(family, child));
}

PROFESSION_FAMILIES.forEach((fam) => collectFlatNodes(fam, fam.root));

export function matchProfessionNode(
  className: string | null | undefined,
  raceHint?: string | null
): {familyId: string; nodeId: string; nodeName: string} | null {
  const key = normalizeProfessionKey(className);
  if (!key) return null;

  const candidates = FLAT_NODES.filter((ref) => ref.keys.includes(key));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    return {
      familyId: candidates[0].familyId,
      nodeId: candidates[0].nodeId,
      nodeName: candidates[0].nodeName,
    };
  }

  // Disambiguate shared names (e.g. Knight, Wizard, Soulbreaker, Soulhound) using raceHint
  const raceLower = (raceHint || '').toLowerCase();
  if (raceLower) {
    const isDark = raceLower.includes('dark') || raceLower.includes('oscuro');
    const isElf =
      !isDark && (raceLower.includes('elf') || raceLower.includes('elven'));
    const isHuman = raceLower.includes('human');
    const isFemale =
      raceLower.includes('female') ||
      raceLower.includes('mujer') ||
      raceLower.includes('femenin');

    if (isElf) {
      const match = candidates.find((c) => c.familyId.startsWith('elf_'));
      if (match) return {familyId: match.familyId, nodeId: match.nodeId, nodeName: match.nodeName};
    }
    if (isHuman) {
      const match = candidates.find((c) => c.familyId.startsWith('human_'));
      if (match) return {familyId: match.familyId, nodeId: match.nodeId, nodeName: match.nodeName};
    }
    if (isDark) {
      const match = candidates.find((c) => c.familyId.startsWith('darkelf_'));
      if (match) return {familyId: match.familyId, nodeId: match.nodeId, nodeName: match.nodeName};
    }
    if (isFemale) {
      const match = candidates.find((c) => c.familyId === 'kamael_female');
      if (match) return {familyId: match.familyId, nodeId: match.nodeId, nodeName: match.nodeName};
    }
  }

  return {
    familyId: candidates[0].familyId,
    nodeId: candidates[0].nodeId,
    nodeName: candidates[0].nodeName,
  };
}

export function countNodesInFamily(family: ProfessionFamily): number {
  let count = 0;
  const walk = (n: ProfessionNode) => {
    count++;
    (n.children || []).forEach(walk);
  };
  walk(family.root);
  return count;
}

export interface ClassOccupancyEntry {
  character: CharacterRecord;
  role: 'main' | 'subclass';
  subIndex?: number;
  rawClassName: string;
  level: number | null;
}
