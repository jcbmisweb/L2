import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {ItemEntry, ItemLocation, L2Database} from '../types/l2';
import {
  ALL_LOCATIONS,
  LOCATION_LABELS,
  formatAdenaShort,
  formatInt,
  normalizeItemKey,
  stripItemEnchantPrefix,
} from '../utils/storage';
import {ItemIcon} from './ItemIcon';

interface GlobalSearchViewProps {
  db: L2Database;
  selectedServer: string;
  onSelectCharacter: (id: string) => void;
  onSelectClan: (id: string) => void;
  onNavigateBridge: () => void;
  onUpdateItem: (
    ownerType: 'character' | 'clan',
    ownerId: string,
    itemId: string,
    patch: {name?: string; quantity?: number | null; uncertain?: boolean}
  ) => void;
  onQuickEditIcon: (itemName: string) => void;
}

interface FlatItemRow {
  ownerType: 'character' | 'clan';
  ownerId: string;
  ownerName: string;
  accountName: string | null;
  server: string;
  clanLinkedMembers: string[];
  item: ItemEntry;
}

interface GroupedItem {
  key: string;
  name: string;
  tags: string[];
  personalTotal: number;
  clanTotal: number;
  hasNullQty: boolean;
  hasUncertain: boolean;
  rows: FlatItemRow[];
}

export function GlobalSearchView({
  db,
  selectedServer,
  onSelectCharacter,
  onSelectClan,
  onNavigateBridge,
  onUpdateItem,
  onQuickEditIcon,
}: GlobalSearchViewProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'characters' | 'clans'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | ItemLocation>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [onlyUncertain, setOnlyUncertain] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'rows'>('grouped');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');

  // Global stats for current server filter
  const stats = useMemo(() => {
    const accountsSet = new Set<string>();
    db.accounts.forEach((a) => {
      if (selectedServer === 'all' || a.server === selectedServer) {
        accountsSet.add(a.id);
      }
    });
    const chars = db.characters.filter(
      (c) => selectedServer === 'all' || c.server === selectedServer
    );
    chars.forEach((c) => accountsSet.add(`${c.server}::${c.account}`));

    const capturedChars = chars.filter((c) => c.status === 'captured').length;
    const pendingChars = chars.filter((c) => c.status === 'pending').length;
    const clans = db.clans.filter(
      (cl) => selectedServer === 'all' || cl.server === selectedServer
    );

    let personalAdena = 0;
    chars.forEach((c) => {
      c.items.forEach((it) => {
        if (it.name.trim().toLowerCase() === 'adena' && typeof it.quantity === 'number') {
          personalAdena += it.quantity;
        }
      });
    });

    let clanAdena = 0;
    clans.forEach((cl) => {
      cl.items.forEach((it) => {
        if (it.name.trim().toLowerCase() === 'adena' && typeof it.quantity === 'number') {
          clanAdena += it.quantity;
        }
      });
    });

    return {
      accountsCount: accountsSet.size,
      capturedChars,
      pendingChars,
      clansCount: clans.length,
      personalAdena,
      clanAdena,
    };
  }, [db, selectedServer]);

  // Flatten all items
  const allRows = useMemo<FlatItemRow[]>(() => {
    const rows: FlatItemRow[] = [];

    db.characters.forEach((char) => {
      if (selectedServer !== 'all' && char.server !== selectedServer) return;
      char.items.forEach((item) => {
        rows.push({
          ownerType: 'character',
          ownerId: char.id,
          ownerName: char.character.name,
          accountName: char.account,
          server: char.server,
          clanLinkedMembers: [],
          item,
        });
      });
    });

    db.clans.forEach((clan) => {
      if (selectedServer !== 'all' && clan.server !== selectedServer) return;
      const members = db.characters
        .filter((c) => c.server === clan.server && c.clan === clan.name)
        .map((c) => c.character.name);

      clan.items.forEach((item) => {
        rows.push({
          ownerType: 'clan',
          ownerId: clan.id,
          ownerName: clan.name,
          accountName: null,
          server: clan.server,
          clanLinkedMembers: members,
          item,
        });
      });
    });

    return rows;
  }, [db, selectedServer]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allRows.forEach((r) => r.item.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const totalUncertain = useMemo(
    () => allRows.filter((r) => r.item.uncertain).length,
    [allRows]
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((row) => {
      if (scope === 'characters' && row.ownerType !== 'character') return false;
      if (scope === 'clans' && row.ownerType !== 'clan') return false;
      if (locationFilter !== 'all' && row.item.location !== locationFilter) {
        return false;
      }
      if (tagFilter !== 'all' && !row.item.tags.includes(tagFilter)) {
        return false;
      }
      if (onlyUncertain && !row.item.uncertain) {
        return false;
      }
      if (q) {
        const hay = `${row.item.name} ${row.item.tags.join(' ')} ${row.ownerName} ${
          row.accountName || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, query, scope, locationFilter, tagFilter, onlyUncertain]);

  const groupedItems = useMemo<GroupedItem[]>(() => {
    const map = new Map<string, GroupedItem>();

    filteredRows.forEach((row) => {
      const sortedTags = row.item.tags.slice().sort();
      const baseName = stripItemEnchantPrefix(row.item.name);
      const key = `${normalizeItemKey(row.item.name)}::${sortedTags.join('|')}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: baseName,
          tags: row.item.tags,
          personalTotal: 0,
          clanTotal: 0,
          hasNullQty: false,
          hasUncertain: false,
          rows: [],
        });
      }
      const group = map.get(key)!;
      group.rows.push(row);
      if (row.item.uncertain) group.hasUncertain = true;
      if (row.item.quantity === null) {
        group.hasNullQty = true;
      } else if (row.ownerType === 'character') {
        group.personalTotal += row.item.quantity;
      } else {
        group.clanTotal += row.item.quantity;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const totalA = a.personalTotal + a.clanTotal;
      const totalB = b.personalTotal + b.clanTotal;
      if (a.name.toLowerCase() === 'adena') return -1;
      if (b.name.toLowerCase() === 'adena') return 1;
      if (totalB !== totalA) return totalB - totalA;
      return a.name.localeCompare(b.name);
    });
  }, [filteredRows]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({...prev, [key]: !prev[key]}));
  };

  const startEditRow = (row: FlatItemRow) => {
    setEditingRowId(row.item.id);
    setEditName(row.item.name);
    setEditQty(row.item.quantity === null ? '' : String(row.item.quantity));
  };

  const saveEditRow = (row: FlatItemRow) => {
    const cleanQty = editQty.replace(/\./g, '').trim();
    const parsedQty = cleanQty === '' ? null : Number(cleanQty);
    onUpdateItem(row.ownerType, row.ownerId, row.item.id, {
      name: editName.trim() || row.item.name,
      quantity: Number.isFinite(parsedQty) ? parsedQty : null,
      uncertain: false,
    });
    setEditingRowId(null);
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip - single elevation with hairline dividers */}
      <section
        aria-label="Resumen global"
        className="grid grid-cols-2 lg:grid-cols-4 bg-[#111827] border border-[#1E293B] rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]"
      >
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Cuentas registradas</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {stats.accountsCount}
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Personajes</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-slate-100">
              {stats.capturedChars}
            </span>
            {stats.pendingChars > 0 && (
              <span className="font-mono text-xs tabular-nums text-amber-400">
                + {stats.pendingChars} pendientes
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Almacenes de clan</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {stats.clansCount}
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Adena total</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              title={formatInt(stats.personalAdena)}
              className="font-mono text-xl font-semibold tabular-nums text-amber-400"
            >
              {formatAdenaShort(stats.personalAdena)}
            </span>
            {stats.clanAdena > 0 && (
              <span className="font-mono text-xs tabular-nums text-slate-400">
                + {formatAdenaShort(stats.clanAdena)} clan
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ítem, etiqueta, personaje o cuenta (ej. Adena, Moirai, Recipe, Coupon...)"
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-9 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Scope segmented buttons */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md shrink-0">
            {(
              [
                ['all', 'Todo'],
                ['characters', 'Personajes'],
                ['clans', 'Clanes'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setScope(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  scope === val
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filtrar por ubicación"
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value as 'all' | ItemLocation)
              }
              className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas las ubicaciones</option>
              {ALL_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por etiqueta"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas las etiquetas</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  Etiqueta: {tag}
                </option>
              ))}
            </select>

            {totalUncertain > 0 && (
              <button
                type="button"
                onClick={() => setOnlyUncertain((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  onlyUncertain
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#0B0F17] border-[#1E293B] text-slate-300 hover:border-slate-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Por revisar ({totalUncertain})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {groupedItems.length} objetos · {filteredRows.length} filas
            </span>

            <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'grouped'
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Agrupado
              </button>
              <button
                type="button"
                onClick={() => setViewMode('rows')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'rows'
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por filas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Empty State */}
      {allRows.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-12 text-center space-y-3">
          <p className="text-sm font-medium text-slate-200">
            No hay objetos indexados todavía.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Usa el Puente IA para copiar el prompt de transcripción, pasar tus capturas de Lineage2.ES y pegar el JSON resultante.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onNavigateBridge}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abrir Puente IA</span>
            </button>
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-10 text-center space-y-2">
          <p className="text-sm text-slate-300">
            Ningún objeto coincide con los filtros actuales.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setScope('all');
              setLocationFilter('all');
              setTagFilter('all');
              setOnlyUncertain(false);
            }}
            className="text-xs text-amber-400 hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped Table */
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                  <th className="py-2.5 pl-4 pr-3">Objeto</th>
                  <th className="py-2.5 px-3">Distribución</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">
                    En personajes
                  </th>
                  <th className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                    En clanes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-xs">
                {groupedItems.map((group) => {
                  const isExpanded = Boolean(expandedKeys[group.key]);

                  // Build per-owner summary line
                  const ownerMap = new Map<
                    string,
                    {
                      ownerType: 'character' | 'clan';
                      ownerName: string;
                      location: ItemLocation;
                      qty: number;
                      rowsCount: number;
                    }
                  >();

                  group.rows.forEach((r) => {
                    const oKey = `${r.ownerId}::${r.item.location}`;
                    if (!ownerMap.has(oKey)) {
                      ownerMap.set(oKey, {
                        ownerType: r.ownerType,
                        ownerName: r.ownerName,
                        location: r.item.location,
                        qty: 0,
                        rowsCount: 0,
                      });
                    }
                    const entry = ownerMap.get(oKey)!;
                    entry.rowsCount++;
                    if (typeof r.item.quantity === 'number') {
                      entry.qty += r.item.quantity;
                    }
                  });

                  const summaryEntries = Array.from(ownerMap.values());

                  return (
                    <FragmentGroupRow
                      key={group.key}
                      group={group}
                      summaryEntries={summaryEntries}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(group.key)}
                      onSelectCharacter={onSelectCharacter}
                      onSelectClan={onSelectClan}
                      itemCatalog={db.itemCatalog}
                      iconBaseUrl={db.iconBaseUrl}
                      onQuickEditIcon={onQuickEditIcon}
                      editingRowId={editingRowId}
                      editName={editName}
                      editQty={editQty}
                      setEditName={setEditName}
                      setEditQty={setEditQty}
                      onStartEdit={startEditRow}
                      onSaveEdit={saveEditRow}
                      onCancelEdit={() => setEditingRowId(null)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Flat Rows Table */
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                  <th className="py-2.5 pl-4 pr-3">Objeto</th>
                  <th className="py-2.5 px-3">Propietario</th>
                  <th className="py-2.5 px-3">Ubicación</th>
                  <th className="py-2.5 px-3 text-right">Cantidad</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-xs">
                {filteredRows.map((row) => {
                  const isEditing = editingRowId === row.item.id;
                  return (
                    <tr
                      key={row.item.id}
                      className="hover:bg-[#161F30]/50 transition-colors"
                    >
                      <td className="py-2 pl-4 pr-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 text-xs text-slate-100"
                          />
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <ItemIcon
                              name={row.item.name}
                              itemCatalog={db.itemCatalog}
                              iconBaseUrl={db.iconBaseUrl}
                              onClick={() => onQuickEditIcon(row.item.name)}
                            />
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                              <span className="font-medium text-slate-100">
                                {row.item.name}
                              </span>
                              {row.item.tags.length > 0 && (
                                <span className="font-mono text-[11px] text-amber-400/90">
                                  {row.item.tags.join(' · ')}
                                </span>
                              )}
                              {row.item.uncertain && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Revisar</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {row.ownerType === 'character' ? (
                          <button
                            type="button"
                            onClick={() => onSelectCharacter(row.ownerId)}
                            className="text-left hover:text-amber-300 transition-colors"
                          >
                            <span className="font-medium text-slate-200">
                              {row.ownerName}
                            </span>
                            <span className="text-slate-500 ml-1.5">
                              · {row.accountName}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectClan(row.ownerId)}
                            className="text-left hover:text-amber-300 transition-colors"
                          >
                            <span className="font-medium text-amber-300">
                              Clan {row.ownerName}
                            </span>
                            {row.clanLinkedMembers.length > 0 && (
                              <span className="text-slate-500 ml-1.5">
                                ({row.clanLinkedMembers.join(', ')})
                              </span>
                            )}
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {LOCATION_LABELS[row.item.location]}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-100">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            className="w-28 text-right bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 font-mono text-xs text-slate-100"
                          />
                        ) : (
                          formatInt(row.item.quantity)
                        )}
                      </td>

                      <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => saveEditRow(row)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                              aria-label="Guardar cambios"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRowId(null)}
                              className="p-1 text-slate-400 hover:text-slate-200"
                              aria-label="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditRow(row)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{row.item.uncertain ? 'Verificar' : 'Editar'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface FragmentGroupRowProps {
  group: GroupedItem;
  summaryEntries: {
    ownerType: 'character' | 'clan';
    ownerName: string;
    location: ItemLocation;
    qty: number;
    rowsCount: number;
  }[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectCharacter: (id: string) => void;
  onSelectClan: (id: string) => void;
  itemCatalog: L2Database['itemCatalog'];
  iconBaseUrl: string;
  onQuickEditIcon: (itemName: string) => void;
  editingRowId: string | null;
  editName: string;
  editQty: string;
  setEditName: (v: string) => void;
  setEditQty: (v: string) => void;
  onStartEdit: (row: FlatItemRow) => void;
  onSaveEdit: (row: FlatItemRow) => void;
  onCancelEdit: () => void;
}

function FragmentGroupRow({
  group,
  summaryEntries,
  isExpanded,
  onToggle,
  onSelectCharacter,
  onSelectClan,
  itemCatalog,
  iconBaseUrl,
  onQuickEditIcon,
  editingRowId,
  editName,
  editQty,
  setEditName,
  setEditQty,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: FragmentGroupRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[#161F30]/60 transition-colors"
      >
        <td className="py-2 pl-4 pr-3">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-500 shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
            <ItemIcon
              name={group.name}
              itemCatalog={itemCatalog}
              iconBaseUrl={iconBaseUrl}
              onClick={() => onQuickEditIcon(group.name)}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-slate-100">{group.name}</span>
                {group.tags.length > 0 && (
                  <span className="font-mono text-[11px] text-amber-400/90">
                    {group.tags.join(' · ')}
                  </span>
                )}
                {group.hasUncertain && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Revisar</span>
                  </span>
                )}
              </div>
              {group.rows.length > 1 && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {group.rows.length} filas en total
                </div>
              )}
            </div>
          </div>
        </td>

        <td className="py-2.5 px-3 text-slate-400">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 max-w-md">
            {summaryEntries.slice(0, 3).map((entry, idx) => (
              <span key={`${entry.ownerName}-${entry.location}-${idx}`}>
                {idx > 0 && <span className="mr-2 text-slate-600">·</span>}
                <span className={entry.ownerType === 'clan' ? 'text-amber-300' : 'text-slate-300'}>
                  {entry.ownerType === 'clan' ? `Clan ${entry.ownerName}` : entry.ownerName}
                </span>{' '}
                <span className="text-slate-500">
                  ({LOCATION_LABELS[entry.location]}
                  {entry.rowsCount > 1 ? `, ${entry.rowsCount} filas` : ''})
                </span>
              </span>
            ))}
            {summaryEntries.length > 3 && (
              <span className="text-slate-500">
                +{summaryEntries.length - 3} más
              </span>
            )}
          </div>
        </td>

        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-100 whitespace-nowrap">
          {group.personalTotal > 0 ? formatInt(group.personalTotal) : '—'}
        </td>

        <td className="py-2.5 pl-3 pr-4 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">
          {group.clanTotal > 0 ? formatInt(group.clanTotal) : '—'}
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-[#0B0F17]/80">
          <td colSpan={4} className="px-6 py-3">
            <div className="border border-[#1E293B] rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#111827] text-[11px] text-slate-400">
                    <th className="py-2 px-3">Propietario</th>
                    <th className="py-2 px-3">Servidor · Cuenta</th>
                    <th className="py-2 px-3">Sección</th>
                    <th className="py-2 px-3 text-right">Cantidad</th>
                    <th className="py-2 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/70">
                  {group.rows.map((row) => {
                    const isEditing = editingRowId === row.item.id;
                    return (
                      <tr key={row.item.id} className="hover:bg-[#161F30]/40">
                        <td className="py-2 px-3">
                          {row.ownerType === 'character' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCharacter(row.ownerId);
                              }}
                              className="font-medium text-slate-200 hover:text-amber-300"
                            >
                              {row.ownerName}
                            </button>
                          ) : (
                            <div className="space-y-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectClan(row.ownerId);
                                }}
                                className="font-medium text-amber-300 hover:underline"
                              >
                                Almacén de clan: {row.ownerName}
                              </button>
                              {row.clanLinkedMembers.length > 0 && (
                                <div className="text-[11px] text-slate-500">
                                  Miembros vinculados: {row.clanLinkedMembers.join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                          {row.item.name !== group.name && (
                            <div className="text-[11px] font-mono text-amber-300/90 mt-0.5">
                              {row.item.name}
                            </div>
                          )}
                          {isEditing && (
                            <input
                              type="text"
                              value={editName}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mt-1 w-full bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 text-xs text-slate-100"
                            />
                          )}
                        </td>

                        <td className="py-2 px-3 text-slate-400">
                          {row.server}
                          {row.accountName ? ` · ${row.accountName}` : ''}
                        </td>

                        <td className="py-2 px-3 text-slate-300">
                          {LOCATION_LABELS[row.item.location]}
                        </td>

                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editQty}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-28 text-right bg-[#0B0F17] border border-amber-500/60 rounded px-2 py-1 font-mono text-xs text-slate-100"
                            />
                          ) : (
                            <span>
                              {formatInt(row.item.quantity)}
                              {row.item.uncertain && (
                                <span className="ml-2 text-amber-300 text-[11px]">
                                  (incierto)
                                </span>
                              )}
                            </span>
                          )}
                        </td>

                        <td
                          className="py-2 px-3 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSaveEdit(row)}
                                className="text-emerald-400 hover:text-emerald-300 font-medium"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={onCancelEdit}
                                className="text-slate-400 hover:text-slate-200"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onStartEdit(row)}
                              className="text-slate-400 hover:text-amber-300"
                            >
                              {row.item.uncertain ? 'Verificar' : 'Editar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
