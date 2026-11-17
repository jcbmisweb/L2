import {
  AlertTriangle,
  Check,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {
  CharacterRecord,
  CharacterStats,
  ClanRecord,
  EquipmentSlot,
  ItemCatalogEntry,
  ItemLocation,
  SubclassInfo,
} from '../types/l2';
import {makeCharacterId} from '../utils/jsonParser';
import {
  CHARACTER_LOCATIONS,
  LOCATION_LABELS,
  formatDateShort,
  formatInt,
} from '../utils/storage';
import {EquipmentPaperdoll} from './EquipmentPaperdoll';
import {ItemIcon} from './ItemIcon';

interface CharacterDetailViewProps {
  character: CharacterRecord;
  allCharacters: CharacterRecord[];
  serverClans: ClanRecord[];
  itemCatalog: Record<string, ItemCatalogEntry>;
  iconBaseUrl: string;
  onQuickEditIcon: (itemName: string) => void;
  onAssignSlot: (characterId: string, itemId: string | null, slot: EquipmentSlot) => void;
  onAssignClan: (characterId: string, clanName: string | null) => void;
  onSelectClan: (clanId: string) => void;
  onSelectAccount?: (accountId: string) => void;
  onUpdateCharacter: (
    characterId: string,
    patch: {
      server?: string;
      account?: string;
      clan?: string | null;
      status?: 'captured' | 'pending';
      character?: Partial<CharacterStats>;
    },
    mergeIfExists?: boolean
  ) => void;
  onDeleteCharacter: (characterId: string) => void;
  onAddItem: (
    ownerType: 'character' | 'clan',
    ownerId: string,
    item: {
      name: string;
      quantity: number | null;
      location: ItemLocation;
      tags: string[];
      slot?: EquipmentSlot | null;
    }
  ) => void;
  onUpdateItem: (
    ownerType: 'character' | 'clan',
    ownerId: string,
    itemId: string,
    patch: {
      name?: string;
      quantity?: number | null;
      uncertain?: boolean;
      location?: ItemLocation;
      tags?: string[];
    }
  ) => void;
  onDeleteItem: (
    ownerType: 'character' | 'clan',
    ownerId: string,
    itemId: string
  ) => void;
  onNavigateBridge: () => void;
}

interface SubclassDraft {
  index: number;
  className: string;
  level: string;
  pct: string;
  hp: string;
  mp: string;
  sp: string;
  creationDate: string;
}

function parseOptionalInt(raw: string): number | null {
  const clean = raw.replace(/\./g, '').replace(/,/g, '').trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseOptionalFloat(raw: string): number | null {
  const clean = raw.replace(',', '.').trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function parseBoolTri(raw: 'true' | 'false' | ''): boolean | null {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

export function CharacterDetailView({
  character,
  allCharacters,
  serverClans,
  itemCatalog,
  iconBaseUrl,
  onQuickEditIcon,
  onAssignSlot,
  onAssignClan,
  onSelectClan,
  onSelectAccount,
  onUpdateCharacter,
  onDeleteCharacter,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onNavigateBridge,
}: CharacterDetailViewProps) {
  const [activeLoc, setActiveLoc] = useState<'all' | ItemLocation>('all');
  const [localQuery, setLocalQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [customClanInput, setCustomClanInput] = useState('');
  const [showNewClanInput, setShowNewClanInput] = useState(false);

  // Item row inline editor
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editLocation, setEditLocation] = useState<ItemLocation>('inventory');
  const [editTags, setEditTags] = useState('');

  // Add new item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemLoc, setNewItemLoc] = useState<ItemLocation>('inventory');
  const [newItemTags, setNewItemTags] = useState('');

  // Full character sheet editor
  const [editingSheet, setEditingSheet] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formServer, setFormServer] = useState('');
  const [formClan, setFormClan] = useState('');
  const [formStatus, setFormStatus] = useState<'captured' | 'pending'>('captured');
  const [formRace, setFormRace] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formLevel, setFormLevel] = useState('');
  const [formPct, setFormPct] = useState('');
  const [formHp, setFormHp] = useState('');
  const [formMp, setFormMp] = useState('');
  const [formSp, setFormSp] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formPvp, setFormPvp] = useState('');
  const [formPk, setFormPk] = useState('');
  const [formKarma, setFormKarma] = useState('');
  const [formPoints, setFormPoints] = useState('');
  const [formNoble, setFormNoble] = useState<'true' | 'false' | ''>('');
  const [formHero, setFormHero] = useState<'true' | 'false' | ''>('');
  const [formOnline, setFormOnline] = useState<'true' | 'false' | ''>('');
  const [formLocation, setFormLocation] = useState('');
  const [formCreationDate, setFormCreationDate] = useState('');
  const [formLastAccess, setFormLastAccess] = useState('');
  const [formLastDisconnect, setFormLastDisconnect] = useState('');
  const [formSubclasses, setFormSubclasses] = useState<SubclassDraft[]>([]);
  const [allowMergeOverwrite, setAllowMergeOverwrite] = useState(false);

  const openSheetEditor = () => {
    const st = character.character;
    setFormName(st.name || '');
    setFormAccount(character.account || '');
    setFormServer(character.server || '');
    setFormClan(character.clan || '');
    setFormStatus(character.status);
    setFormRace(st.race || '');
    setFormClass(st.class || '');
    setFormLevel(st.level !== null && st.level !== undefined ? String(st.level) : '');
    setFormPct(
      st.level_progress_pct !== null && st.level_progress_pct !== undefined
        ? String(st.level_progress_pct)
        : ''
    );
    setFormHp(st.hp !== null && st.hp !== undefined ? String(st.hp) : '');
    setFormMp(st.mp !== null && st.mp !== undefined ? String(st.mp) : '');
    setFormSp(st.sp !== null && st.sp !== undefined ? String(st.sp) : '');
    setFormHours(
      st.hours_played !== null && st.hours_played !== undefined
        ? String(st.hours_played)
        : ''
    );
    setFormPvp(st.pvp !== null && st.pvp !== undefined ? String(st.pvp) : '');
    setFormPk(st.pk !== null && st.pk !== undefined ? String(st.pk) : '');
    setFormKarma(st.karma !== null && st.karma !== undefined ? String(st.karma) : '');
    setFormPoints(
      st.points !== null && st.points !== undefined ? String(st.points) : ''
    );
    setFormNoble(st.noble === true ? 'true' : st.noble === false ? 'false' : '');
    setFormHero(st.hero === true ? 'true' : st.hero === false ? 'false' : '');
    setFormOnline(st.online === true ? 'true' : st.online === false ? 'false' : '');
    setFormLocation(st.location || '');
    setFormCreationDate(st.creation_date || '');
    setFormLastAccess(st.last_access || '');
    setFormLastDisconnect(st.last_disconnect || '');
    setFormSubclasses(
      (st.subclasses || []).map((s, idx) => ({
        index: s.index || idx + 1,
        className: s.class || '',
        level: s.level !== null && s.level !== undefined ? String(s.level) : '',
        pct:
          s.level_progress_pct !== null && s.level_progress_pct !== undefined
            ? String(s.level_progress_pct)
            : '',
        hp: s.hp !== null && s.hp !== undefined ? String(s.hp) : '',
        mp: s.mp !== null && s.mp !== undefined ? String(s.mp) : '',
        sp: s.sp !== null && s.sp !== undefined ? String(s.sp) : '',
        creationDate: s.creation_date || '',
      }))
    );
    setAllowMergeOverwrite(false);
    setEditingSheet(true);
  };

  const targetCollision = useMemo(() => {
    if (!editingSheet) return null;
    const srv = formServer.trim() || character.server;
    const acc = formAccount.trim() || character.account;
    const nm = formName.trim() || character.character.name;
    const nextId = makeCharacterId(srv, acc, nm);
    if (nextId === character.id) return null;
    return allCharacters.find((c) => c.id === nextId) || null;
  }, [
    editingSheet,
    formServer,
    formAccount,
    formName,
    character.id,
    character.server,
    character.account,
    character.character.name,
    allCharacters,
  ]);

  const handleSaveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAccount.trim() || !formServer.trim()) return;
    if (
      targetCollision &&
      targetCollision.status === 'captured' &&
      !allowMergeOverwrite
    ) {
      return;
    }

    const nextSubclasses: SubclassInfo[] = formSubclasses
      .filter((s) => s.className.trim() || s.level.trim())
      .map((s, idx) => ({
        index: idx + 1,
        class: s.className.trim() || null,
        level: parseOptionalInt(s.level),
        level_progress_pct: parseOptionalFloat(s.pct),
        hp: parseOptionalInt(s.hp),
        mp: parseOptionalInt(s.mp),
        sp: parseOptionalInt(s.sp),
        creation_date: s.creationDate.trim() || null,
      }));

    onUpdateCharacter(
      character.id,
      {
        server: formServer.trim(),
        account: formAccount.trim(),
        clan: formClan.trim() || null,
        status: formStatus,
        character: {
          name: formName.trim(),
          race: formRace.trim() || null,
          class: formClass.trim() || null,
          level: parseOptionalInt(formLevel),
          level_progress_pct: parseOptionalFloat(formPct),
          hp: parseOptionalInt(formHp),
          mp: parseOptionalInt(formMp),
          sp: parseOptionalInt(formSp),
          hours_played: parseOptionalInt(formHours),
          pvp: parseOptionalInt(formPvp),
          pk: parseOptionalInt(formPk),
          karma: parseOptionalInt(formKarma),
          points: parseOptionalInt(formPoints),
          noble: parseBoolTri(formNoble),
          hero: parseBoolTri(formHero),
          online: parseBoolTri(formOnline),
          location: formLocation.trim() || null,
          creation_date: formCreationDate.trim() || null,
          last_access: formLastAccess.trim() || null,
          last_disconnect: formLastDisconnect.trim() || null,
          subclasses: nextSubclasses,
        },
      },
      allowMergeOverwrite
    );
    setEditingSheet(false);
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const cleanQty = newItemQty.replace(/\./g, '').trim();
    const parsedQty = cleanQty === '' ? null : Number(cleanQty);
    onAddItem('character', character.id, {
      name: newItemName.trim(),
      quantity: Number.isFinite(parsedQty) ? parsedQty : null,
      location: newItemLoc,
      tags: newItemTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setNewItemName('');
    setNewItemQty('1');
    setNewItemTags('');
    setShowAddItem(false);
  };

  const linkedClanRecord = useMemo(
    () =>
      character.clan
        ? serverClans.find((cl) => cl.name === character.clan) || null
        : null,
    [character.clan, serverClans]
  );

  const equippedItems = useMemo(
    () => character.items.filter((it) => it.location === 'equipped'),
    [character.items]
  );

  const countsByLocation = useMemo(() => {
    const map: Record<ItemLocation, number> = {
      equipped: 0,
      inventory: 0,
      warehouse: 0,
      mail: 0,
      pets: 0,
      quests: 0,
      clan_warehouse: 0,
    };
    character.items.forEach((it) => {
      map[it.location] = (map[it.location] || 0) + 1;
    });
    return map;
  }, [character.items]);

  const filteredItems = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    return character.items.filter((item) => {
      if (activeLoc !== 'all' && item.location !== activeLoc) return false;
      if (q) {
        const hay = `${item.name} ${item.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [character.items, activeLoc, localQuery]);

  const stats = character.character;
  const subclasses = stats.subclasses || [];

  const sheetEditorForm = editingSheet && (
    <form
      onSubmit={handleSaveSheet}
      className="bg-[#0B0F17] border border-amber-500/40 rounded-md p-4 space-y-4 text-xs"
    >
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Modificar datos del personaje
          </h2>
          <p className="text-[11px] text-slate-400">
            Corrige errores de transcripción como nombre, cuenta, servidor, estadísticas o subclases.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingSheet(false)}
          className="text-slate-400 hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Identidad y pertenencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-slate-400 mb-1">Nombre *</label>
          <input
            type="text"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Cuenta *</label>
          <input
            type="text"
            required
            value={formAccount}
            onChange={(e) => setFormAccount(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Servidor *</label>
          <input
            type="text"
            required
            value={formServer}
            onChange={(e) => setFormServer(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Clan</label>
          <input
            type="text"
            value={formClan}
            onChange={(e) => setFormClan(e.target.value)}
            placeholder="Sin clan"
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Estado</label>
          <select
            value={formStatus}
            onChange={(e) =>
              setFormStatus(e.target.value as 'captured' | 'pending')
            }
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="captured">Capturado</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
      </div>

      {targetCollision && (
        <div className="bg-amber-950/35 border border-amber-700/60 rounded px-3 py-2.5 text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Ya existe un registro llamado <strong>{targetCollision.character.name}</strong> en{' '}
              <strong>{targetCollision.account}</strong> ({targetCollision.server}, estado:{' '}
              {targetCollision.status === 'captured' ? 'Capturado' : 'Pendiente'}).
            </span>
          </div>
          {targetCollision.status === 'captured' && (
            <label className="flex items-center gap-2 cursor-pointer text-amber-100">
              <input
                type="checkbox"
                checked={allowMergeOverwrite}
                onChange={(e) => setAllowMergeOverwrite(e.target.checked)}
                className="accent-amber-500"
              />
              <span>
                Reemplazar el personaje existente con esta ficha e inventario
              </span>
            </label>
          )}
        </div>
      )}

      {/* Datos generales & Main */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-slate-400 mb-1">Raza</label>
          <input
            type="text"
            value={formRace}
            onChange={(e) => setFormRace(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Clase</label>
          <input
            type="text"
            value={formClass}
            onChange={(e) => setFormClass(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Nivel</label>
          <input
            type="text"
            value={formLevel}
            onChange={(e) => setFormLevel(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Progreso %</label>
          <input
            type="text"
            value={formPct}
            onChange={(e) => setFormPct(e.target.value)}
            placeholder="85.132"
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">HP</label>
          <input
            type="text"
            value={formHp}
            onChange={(e) => setFormHp(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">MP</label>
          <input
            type="text"
            value={formMp}
            onChange={(e) => setFormMp(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">SP</label>
          <input
            type="text"
            value={formSp}
            onChange={(e) => setFormSp(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Horas</label>
          <input
            type="text"
            value={formHours}
            onChange={(e) => setFormHours(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">PvP</label>
          <input
            type="text"
            value={formPvp}
            onChange={(e) => setFormPvp(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">PK</label>
          <input
            type="text"
            value={formPk}
            onChange={(e) => setFormPk(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Karma</label>
          <input
            type="text"
            value={formKarma}
            onChange={(e) => setFormKarma(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Puntos</label>
          <input
            type="text"
            value={formPoints}
            onChange={(e) => setFormPoints(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div>
          <label className="block text-slate-400 mb-1">Noble</label>
          <select
            value={formNoble}
            onChange={(e) =>
              setFormNoble(e.target.value as 'true' | 'false' | '')
            }
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">—</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Héroe</label>
          <select
            value={formHero}
            onChange={(e) =>
              setFormHero(e.target.value as 'true' | 'false' | '')
            }
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">—</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Online</label>
          <select
            value={formOnline}
            onChange={(e) =>
              setFormOnline(e.target.value as 'true' | 'false' | '')
            }
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">—</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Ubicación</label>
          <input
            type="text"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Fecha creación</label>
          <input
            type="text"
            value={formCreationDate}
            onChange={(e) => setFormCreationDate(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Último acceso</label>
          <input
            type="text"
            value={formLastAccess}
            onChange={(e) => setFormLastAccess(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Desconexión</label>
          <input
            type="text"
            value={formLastDisconnect}
            onChange={(e) => setFormLastDisconnect(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Subclasses editor */}
      <div className="space-y-2 pt-2 border-t border-[#1E293B]">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-semibold">
            Subclases ({formSubclasses.length})
          </span>
          {formSubclasses.length < 3 && (
            <button
              type="button"
              onClick={() =>
                setFormSubclasses((prev) => [
                  ...prev,
                  {
                    index: prev.length + 1,
                    className: '',
                    level: '',
                    pct: '',
                    hp: '',
                    mp: '',
                    sp: '',
                    creationDate: '',
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir subclase</span>
            </button>
          )}
        </div>

        {formSubclasses.map((sub, idx) => (
          <div
            key={idx}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-end bg-[#111827] border border-[#1E293B] rounded p-2.5"
          >
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Sub {idx + 1} · Clase
              </label>
              <input
                type="text"
                value={sub.className}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, className: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Nivel</label>
              <input
                type="text"
                value={sub.level}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, level: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">%</label>
              <input
                type="text"
                value={sub.pct}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, pct: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">HP</label>
              <input
                type="text"
                value={sub.hp}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, hp: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">MP</label>
              <input
                type="text"
                value={sub.mp}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, mp: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">SP</label>
              <input
                type="text"
                value={sub.sp}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, sp: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Creación</label>
              <input
                type="text"
                value={sub.creationDate}
                onChange={(e) =>
                  setFormSubclasses((prev) =>
                    prev.map((item, i) =>
                      i === idx ? {...item, creationDate: e.target.value} : item
                    )
                  )
                }
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 font-mono text-slate-100"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setFormSubclasses((prev) => prev.filter((_, i) => i !== idx))
                }
                className="px-2 py-1 text-red-400 hover:text-red-300"
                title="Quitar subclase"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
        <button
          type="button"
          onClick={() => setEditingSheet(false)}
          className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={
            Boolean(targetCollision) &&
            targetCollision?.status === 'captured' &&
            !allowMergeOverwrite
          }
          className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-[#1E293B] disabled:text-slate-500 text-slate-950 font-semibold"
        >
          Guardar cambios
        </button>
      </div>
    </form>
  );

  if (character.status === 'pending') {
    return (
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              {stats.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {character.server} · Cuenta:{' '}
              {onSelectAccount ? (
                <button
                  type="button"
                  onClick={() =>
                    onSelectAccount(`${character.server}::${character.account}`)
                  }
                  className="text-amber-300 hover:underline font-medium"
                >
                  {character.account}
                </button>
              ) : (
                character.account
              )}{' '}
              · Estado: Pendiente de captura
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSheetEditor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar ficha</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-red-400 hover:bg-red-950/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-300">¿Eliminar registro?</span>
                <button
                  type="button"
                  onClick={() => onDeleteCharacter(character.id)}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {sheetEditorForm}

        <p className="text-sm text-slate-300 max-w-xl">
          Este personaje se detectó en la lista de personajes de la cuenta{' '}
          <strong className="text-slate-100">{character.account}</strong>, pero aún no has importado sus capturas de equipo e inventario.
        </p>

        <button
          type="button"
          onClick={onNavigateBridge}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Importar datos de {stats.name}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Character Header, Extended Stats & Subclasses */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
                {stats.name}
              </h1>
              <span
                className={`text-xs font-medium ${
                  stats.online ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {stats.online === true
                  ? 'Online'
                  : stats.online === false
                  ? 'Offline'
                  : 'Estado desconocido'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span>{character.server}</span>
              <span aria-hidden="true">·</span>
              <span>
                Cuenta:{' '}
                {onSelectAccount ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectAccount(`${character.server}::${character.account}`)
                    }
                    className="text-amber-300 hover:underline font-medium"
                  >
                    {character.account}
                  </button>
                ) : (
                  character.account
                )}
              </span>
              <span aria-hidden="true">·</span>
              <span>{stats.race || 'Raza ?'}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200 font-medium">
                {stats.class || 'Clase ?'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Actualizado: {formatDateShort(character.updatedAt)}</span>
            </div>
          </div>

          {/* Edit Sheet, Clan link & Delete */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => (editingSheet ? setEditingSheet(false) : openSheetEditor())}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs whitespace-nowrap shrink-0 transition-colors ${
                editingSheet
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-[#161F30] hover:bg-[#1E293B] border-[#283548] text-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{editingSheet ? 'Cerrar editor' : 'Editar ficha'}</span>
            </button>

            {!showNewClanInput ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Clan vinculado"
                  value={character.clan || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      setShowNewClanInput(true);
                      return;
                    }
                    onAssignClan(character.id, val || null);
                  }}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Sin clan vinculado</option>
                  {serverClans.map((cl) => (
                    <option key={cl.id} value={cl.name}>
                      Clan: {cl.name}
                    </option>
                  ))}
                  {character.clan &&
                    !serverClans.some((cl) => cl.name === character.clan) && (
                      <option value={character.clan}>
                        Clan: {character.clan}
                      </option>
                    )}
                  <option value="__new__">+ Escribir nombre de clan...</option>
                </select>

                {linkedClanRecord && (
                  <button
                    type="button"
                    onClick={() => onSelectClan(linkedClanRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-amber-300 whitespace-nowrap shrink-0"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Ver almacén de clan ({linkedClanRecord.items.length})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customClanInput}
                  onChange={(e) => setCustomClanInput(e.target.value)}
                  placeholder="Nombre del clan..."
                  className="bg-[#0B0F17] border border-amber-500/60 rounded-md px-2.5 py-1.5 text-xs text-slate-100 w-40"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customClanInput.trim()) {
                      onAssignClan(character.id, customClanInput.trim());
                    }
                    setCustomClanInput('');
                    setShowNewClanInput(false);
                  }}
                  className="px-2.5 py-1.5 rounded bg-amber-500 text-slate-950 text-xs font-medium"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomClanInput('');
                    setShowNewClanInput(false);
                  }}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            )}

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Eliminar personaje"
                className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onDeleteCharacter(character.id)}
                  className="px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium whitespace-nowrap shrink-0"
                >
                  Confirmar borrado
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {sheetEditorForm}

        {/* 3-Column Character Panel: Datos | Estadísticas | Main */}
        <div className="grid grid-cols-1 md:grid-cols-3 border border-[#1E293B] rounded-md bg-[#0B0F17] divide-y md:divide-y-0 md:divide-x divide-[#1E293B]">
          {/* Col 1: Datos del personaje */}
          <div className="p-3.5 space-y-2">
            <h2 className="text-[11px] font-semibold text-amber-400">
              Datos del personaje
            </h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-slate-500">Raza</dt>
              <dd className="text-slate-200 font-medium text-right">{stats.race || '—'}</dd>
              <dt className="text-slate-500">Clase</dt>
              <dd className="text-slate-200 font-medium text-right">{stats.class || '—'}</dd>
              <dt className="text-slate-500">Clan</dt>
              <dd className="text-slate-200 font-medium text-right">
                {character.clan || '—'}
              </dd>
              <dt className="text-slate-500">Fecha creación</dt>
              <dd className="font-mono tabular-nums text-slate-300 text-right">
                {stats.creation_date || '—'}
              </dd>
              <dt className="text-slate-500">Último acceso</dt>
              <dd className="font-mono tabular-nums text-slate-300 text-right">
                {stats.last_access || '—'}
              </dd>
              <dt className="text-slate-500">Desconexión</dt>
              <dd className="font-mono tabular-nums text-slate-300 text-right">
                {stats.last_disconnect || '—'}
              </dd>
              <dt className="text-slate-500">Ubicación</dt>
              <dd className="text-slate-200 text-right truncate" title={stats.location || ''}>
                {stats.location || '—'}
              </dd>
            </dl>
          </div>

          {/* Col 2: Estadísticas del personaje */}
          <div className="p-3.5 space-y-2">
            <h2 className="text-[11px] font-semibold text-amber-400">
              Estadísticas del personaje
            </h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-slate-500">Horas</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.hours_played)}
              </dd>
              <dt className="text-slate-500">PvP</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.pvp)}
              </dd>
              <dt className="text-slate-500">PK</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.pk)}
              </dd>
              <dt className="text-slate-500">Karma</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.karma)}
              </dd>
              <dt className="text-slate-500">Noble</dt>
              <dd className="text-slate-200 text-right">
                {stats.noble ? 'Sí' : stats.noble === false ? 'No' : '—'}
              </dd>
              <dt className="text-slate-500">Puntos</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.points)}
              </dd>
              <dt className="text-slate-500">Héroe</dt>
              <dd className="text-slate-200 text-right">
                {stats.hero ? 'Sí' : stats.hero === false ? 'No' : '—'}
              </dd>
            </dl>
          </div>

          {/* Col 3: Main */}
          <div className="p-3.5 space-y-2">
            <h2 className="text-[11px] font-semibold text-amber-400">Main</h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-slate-500">Nivel</dt>
              <dd className="font-mono tabular-nums text-slate-100 font-semibold text-right">
                {stats.level !== null
                  ? `${stats.level}${
                      stats.level_progress_pct !== null
                        ? ` (${stats.level_progress_pct.toFixed(3)}%)`
                        : ''
                    }`
                  : '—'}
              </dd>
              <dt className="text-slate-500">Clase</dt>
              <dd className="text-slate-200 font-medium text-right">
                {stats.class || '—'}
              </dd>
              <dt className="text-slate-500">HP / MP</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.hp)} / {formatInt(stats.mp)}
              </dd>
              <dt className="text-slate-500">SP</dt>
              <dd className="font-mono tabular-nums text-slate-200 text-right">
                {formatInt(stats.sp)}
              </dd>
            </dl>
          </div>
        </div>

        {/* Subclasses Row (Subclase 1, Subclase 2, Subclase 3) */}
        {subclasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#1E293B] rounded-md bg-[#0B0F17] divide-y md:divide-y-0 md:divide-x divide-[#1E293B]">
            {subclasses.map((sub, idx) => (
              <div key={`${sub.index}-${idx}`} className="p-3.5 space-y-2">
                <h3 className="text-[11px] font-semibold text-amber-400">
                  Subclase {sub.index || idx + 1}
                </h3>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <dt className="text-slate-500">Nivel</dt>
                  <dd className="font-mono tabular-nums text-slate-100 font-semibold text-right">
                    {sub.level !== null
                      ? `${sub.level}${
                          sub.level_progress_pct !== null
                            ? ` (${sub.level_progress_pct.toFixed(3)}%)`
                            : ''
                        }`
                      : '—'}
                  </dd>
                  <dt className="text-slate-500">Clase</dt>
                  <dd className="text-slate-200 font-medium text-right">
                    {sub.class || '—'}
                  </dd>
                  <dt className="text-slate-500">HP / MP</dt>
                  <dd className="font-mono tabular-nums text-slate-200 text-right">
                    {formatInt(sub.hp)} / {formatInt(sub.mp)}
                  </dd>
                  <dt className="text-slate-500">SP</dt>
                  <dd className="font-mono tabular-nums text-slate-200 text-right">
                    {formatInt(sub.sp)}
                  </dd>
                  <dt className="text-slate-500">Fecha creación</dt>
                  <dd className="font-mono tabular-nums text-slate-300 text-right">
                    {sub.creation_date || '—'}
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500">
            Subclases: sin subclases registradas en este personaje.
          </div>
        )}
      </section>

      {/* Equipment Paperdoll (Left) + Inventory Tables (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-4">
          <EquipmentPaperdoll
            equippedItems={equippedItems}
            itemCatalog={itemCatalog}
            iconBaseUrl={iconBaseUrl}
            onQuickEditIcon={onQuickEditIcon}
            onAssignSlot={(itemId, slot) =>
              onAssignSlot(character.id, itemId, slot)
            }
          />
        </div>

        <section className="xl:col-span-8 bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#1E293B] space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Location Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
                <button
                  type="button"
                  onClick={() => setActiveLoc('all')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    activeLoc === 'all'
                      ? 'bg-[#1E293B] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todo ({character.items.length})
                </button>
                {CHARACTER_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setActiveLoc(loc)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      activeLoc === loc
                        ? 'bg-[#1E293B] text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {LOCATION_LABELS[loc]} ({countsByLocation[loc]})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Local Filter */}
                <div className="relative flex-1 lg:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    placeholder="Filtrar objetos..."
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {localQuery && (
                    <button
                      type="button"
                      onClick={() => setLocalQuery('')}
                      aria-label="Limpiar filtro"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewItemLoc(activeLoc === 'all' ? 'inventory' : activeLoc);
                    setShowAddItem((v) => !v);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {showAddItem && (
              <form
                onSubmit={handleAddItemSubmit}
                className="bg-[#0B0F17] border border-amber-500/40 rounded-md p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Nombre del objeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ej. Adena"
                    className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Sección
                  </label>
                  <select
                    value={newItemLoc}
                    onChange={(e) => setNewItemLoc(e.target.value as ItemLocation)}
                    className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {CHARACTER_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {LOCATION_LABELS[loc]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="text"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Etiquetas (coma)
                    </label>
                    <input
                      type="text"
                      value={newItemTags}
                      onChange={(e) => setNewItemTags(e.target.value)}
                      placeholder="S, Robe"
                      className="w-full bg-[#111827] border border-[#1E293B] rounded px-2 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-4 px-2.5 py-1.5 rounded bg-amber-500 text-slate-950 font-semibold"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-400">
              No hay datos disponibles en esta sección.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                    <th className="py-2.5 pl-4 pr-3">Objeto</th>
                    <th className="py-2.5 px-3">Sección</th>
                    <th className="py-2.5 px-3 text-right">Cantidad</th>
                    <th className="py-2.5 pl-3 pr-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B] text-xs">
                  {filteredItems.map((item) => {
                    const isEditing = editingItemId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#161F30]/50 transition-colors"
                      >
                        <td className="py-2 pl-4 pr-3">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nombre"
                                className="w-full bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 text-xs text-slate-100"
                              />
                              <input
                                type="text"
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                placeholder="Etiquetas separadas por coma (ej. S, SA)"
                                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 text-[11px] font-mono text-amber-300"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <ItemIcon
                                name={item.name}
                                itemCatalog={itemCatalog}
                                iconBaseUrl={iconBaseUrl}
                                onClick={() => onQuickEditIcon(item.name)}
                              />
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                                <span className="font-medium text-slate-100">
                                  {item.name}
                                </span>
                                {item.tags.length > 0 && (
                                  <span className="font-mono text-[11px] text-amber-400/90">
                                    {item.tags.join(' · ')}
                                  </span>
                                )}
                                {item.uncertain && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Revisar</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editLocation}
                              onChange={(e) =>
                                setEditLocation(e.target.value as ItemLocation)
                              }
                              className="bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-1 text-xs text-slate-100"
                            >
                              {CHARACTER_LOCATIONS.map((loc) => (
                                <option key={loc} value={loc}>
                                  {LOCATION_LABELS[loc]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            LOCATION_LABELS[item.location]
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-100 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-28 text-right bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 font-mono text-xs text-slate-100"
                            />
                          ) : (
                            formatInt(item.quantity)
                          )}
                        </td>

                        <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const cleanQty = editQty.replace(/\./g, '').trim();
                                  const parsedQty =
                                    cleanQty === '' ? null : Number(cleanQty);
                                  onUpdateItem('character', character.id, item.id, {
                                    name: editName.trim() || item.name,
                                    quantity: Number.isFinite(parsedQty)
                                      ? parsedQty
                                      : null,
                                    location: editLocation,
                                    tags: editTags
                                      .split(',')
                                      .map((t) => t.trim())
                                      .filter(Boolean),
                                    uncertain: false,
                                  });
                                  setEditingItemId(null);
                                }}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                                aria-label="Guardar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteItem('character', character.id, item.id);
                                  setEditingItemId(null);
                                }}
                                className="p-1 text-red-400 hover:text-red-300"
                                aria-label="Eliminar fila"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="p-1 text-slate-400 hover:text-slate-200"
                                aria-label="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditName(item.name);
                                setEditLocation(item.location);
                                setEditTags(item.tags.join(', '));
                                setEditQty(
                                  item.quantity === null ? '' : String(item.quantity)
                                );
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{item.uncertain ? 'Verificar' : 'Editar'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
