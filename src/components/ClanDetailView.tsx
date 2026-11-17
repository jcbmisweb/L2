import {
  AlertTriangle,
  Check,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {
  CharacterRecord,
  ClanRecord,
  EquipmentSlot,
  ItemCatalogEntry,
  ItemLocation,
} from '../types/l2';
import {formatDateShort, formatInt} from '../utils/storage';
import {ItemIcon} from './ItemIcon';

interface ClanDetailViewProps {
  clan: ClanRecord;
  serverCharacters: CharacterRecord[];
  itemCatalog: Record<string, ItemCatalogEntry>;
  iconBaseUrl: string;
  onQuickEditIcon: (itemName: string) => void;
  onSelectCharacter: (id: string) => void;
  onAssignCharacterClan: (characterId: string, clanName: string | null) => void;
  onUpdateClan: (
    clanId: string,
    patch: {name?: string; server?: string}
  ) => void;
  onDeleteClan: (clanId: string) => void;
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

export function ClanDetailView({
  clan,
  serverCharacters,
  itemCatalog,
  iconBaseUrl,
  onQuickEditIcon,
  onSelectCharacter,
  onAssignCharacterClan,
  onUpdateClan,
  onDeleteClan,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onNavigateBridge,
}: ClanDetailViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCharToLink, setSelectedCharToLink] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editingClan, setEditingClan] = useState(false);
  const [clanNameInput, setClanNameInput] = useState('');
  const [clanServerInput, setClanServerInput] = useState('');

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemTags, setNewItemTags] = useState('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editTags, setEditTags] = useState('');

  const members = useMemo(
    () =>
      serverCharacters
        .filter((c) => c.clan === clan.name)
        .sort((a, b) => a.character.name.localeCompare(b.character.name)),
    [serverCharacters, clan.name]
  );

  const unlinkedCharacters = useMemo(
    () =>
      serverCharacters
        .filter((c) => c.clan !== clan.name)
        .sort((a, b) => a.character.name.localeCompare(b.character.name)),
    [serverCharacters, clan.name]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clan.items.filter((item) => {
      if (!q) return true;
      const hay = `${item.name} ${item.tags.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clan.items, query]);

  const clanAdena = useMemo(() => {
    return clan.items.reduce((acc, item) => {
      if (item.name.trim().toLowerCase() === 'adena' && typeof item.quantity === 'number') {
        return acc + item.quantity;
      }
      return acc;
    }, 0);
  }, [clan.items]);

  return (
    <div className="space-y-5">
      {/* Clan Header */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
              Clan: {clan.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 mt-1">
              <span>{clan.server}</span>
              <span aria-hidden="true">·</span>
              <span>
                Miembros vinculados:{' '}
                <strong className="font-mono tabular-nums text-slate-200">
                  {members.length}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Objetos en almacén:{' '}
                <strong className="font-mono tabular-nums text-slate-200">
                  {clan.items.length}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Adena:{' '}
                <strong className="font-mono tabular-nums text-amber-400">
                  {formatInt(clanAdena)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>Actualizado: {formatDateShort(clan.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!editingClan) {
                  setClanNameInput(clan.name);
                  setClanServerInput(clan.server);
                }
                setEditingClan((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs whitespace-nowrap shrink-0 ${
                editingClan
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-[#161F30] hover:bg-[#1E293B] border-[#283548] text-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{editingClan ? 'Cerrar editor' : 'Editar clan'}</span>
            </button>

            <button
              type="button"
              onClick={onNavigateBridge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Actualizar con Puente IA</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Eliminar clan"
                className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onDeleteClan(clan.id)}
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

        {editingClan && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!clanNameInput.trim() || !clanServerInput.trim()) return;
              onUpdateClan(clan.id, {
                name: clanNameInput.trim(),
                server: clanServerInput.trim(),
              });
              setEditingClan(false);
            }}
            className="bg-[#0B0F17] border border-amber-500/40 rounded-md p-3.5 flex flex-wrap items-end gap-3 text-xs"
          >
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] text-slate-400 mb-1">
                Nombre del clan *
              </label>
              <input
                type="text"
                required
                value={clanNameInput}
                onChange={(e) => setClanNameInput(e.target.value)}
                className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] text-slate-400 mb-1">
                Servidor *
              </label>
              <input
                type="text"
                required
                value={clanServerInput}
                onChange={(e) => setClanServerInput(e.target.value)}
                className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingClan(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        )}

        {/* Linked Members Section */}
        <div className="pt-4 border-t border-[#1E293B] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-300">
              Personajes con acceso a este almacén compartido
            </h2>

            {unlinkedCharacters.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Seleccionar personaje para vincular"
                  value={selectedCharToLink}
                  onChange={(e) => setSelectedCharToLink(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Vincular personaje de {clan.server}...</option>
                  {unlinkedCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.character.name} ({c.account})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedCharToLink}
                  onClick={() => {
                    if (!selectedCharToLink) return;
                    onAssignCharacterClan(selectedCharToLink, clan.name);
                    setSelectedCharToLink('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-[#1E293B] disabled:text-slate-500 text-slate-950 font-medium text-xs whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Vincular</span>
                </button>
              </div>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-xs text-slate-500">
              No hay personajes vinculados todavía. Vincula un personaje arriba o desde su ficha individual.
            </p>
          ) : (
            <div className="divide-y divide-[#1E293B] border border-[#1E293B] rounded-md bg-[#0B0F17]">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => onSelectCharacter(member.id)}
                    className="flex flex-wrap items-center gap-x-2 text-left hover:text-amber-300 transition-colors"
                  >
                    <span className="font-medium text-slate-100">
                      {member.character.name}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{member.account}</span>
                    {member.character.class && (
                      <>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">
                          {member.character.class} (Nv {member.character.level ?? '?'})
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onAssignCharacterClan(member.id, null)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 whitespace-nowrap shrink-0"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>Desvincular</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Clan Warehouse Items */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1E293B] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Almacén compartido del clan ({clan.items.length})
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filtrar almacén de clan..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Limpiar filtro"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAddItem((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          {showAddItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItemName.trim()) return;
                const cleanQty = newItemQty.replace(/\./g, '').trim();
                const parsedQty = cleanQty === '' ? null : Number(cleanQty);
                onAddItem('clan', clan.id, {
                  name: newItemName.trim(),
                  quantity: Number.isFinite(parsedQty) ? parsedQty : null,
                  location: 'clan_warehouse',
                  tags: newItemTags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                });
                setNewItemName('');
                setNewItemQty('1');
                setNewItemTags('');
                setShowAddItem(false);
              }}
              className="bg-[#0B0F17] border border-amber-500/40 rounded-md p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs"
            >
              <div className="sm:col-span-5">
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
                  Etiquetas (coma)
                </label>
                <input
                  type="text"
                  value={newItemTags}
                  onChange={(e) => setNewItemTags(e.target.value)}
                  placeholder="S, Event"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
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
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            {clan.items.length === 0
              ? 'Este almacén de clan está vacío. Importa una captura de tipo "clan_warehouse" desde el Puente IA.'
              : 'No hay objetos que coincidan con el filtro.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                  <th className="py-2.5 pl-4 pr-3">Objeto</th>
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
                              className="w-full bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 text-xs text-slate-100"
                            />
                            <input
                              type="text"
                              value={editTags}
                              onChange={(e) => setEditTags(e.target.value)}
                              placeholder="Etiquetas separadas por coma"
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
                                onUpdateItem('clan', clan.id, item.id, {
                                  name: editName.trim() || item.name,
                                  quantity: Number.isFinite(parsedQty)
                                    ? parsedQty
                                    : null,
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
                                onDeleteItem('clan', clan.id, item.id);
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
  );
}
