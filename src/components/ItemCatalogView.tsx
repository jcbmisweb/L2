import {
  Check,
  FilePlus2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {L2Database} from '../types/l2';
import {
  DEFAULT_ICON_BASE_URL,
  normalizeIconInput,
  normalizeItemKey,
} from '../utils/storage';
import {ItemIcon} from './ItemIcon';

interface ItemCatalogViewProps {
  db: L2Database;
  onUpsertCatalogEntry: (name: string, rawIcon: string) => void;
  onBulkUpsertCatalog: (entries: {name: string; icon: string}[]) => void;
  onSetIconBaseUrl: (url: string) => void;
}

interface MergedCatalogRow {
  key: string;
  name: string;
  icon: string;
  owners: string[];
}

export function ItemCatalogView({
  db,
  onUpsertCatalogEntry,
  onBulkUpsertCatalog,
  onSetIconBaseUrl,
}: ItemCatalogViewProps) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'linked'>('all');

  const [baseUrlInput, setBaseUrlInput] = useState(
    db.iconBaseUrl || DEFAULT_ICON_BASE_URL
  );
  const [savedBaseUrl, setSavedBaseUrl] = useState(false);

  // Add single item manually
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');

  // Bulk import toggle & text
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkResultMsg, setBulkResultMsg] = useState<string | null>(null);

  // Per-row inline draft values
  const [draftIcons, setDraftIcons] = useState<Record<string, string>>({});
  const [justSavedKey, setJustSavedKey] = useState<string | null>(null);

  const mergedRows = useMemo<MergedCatalogRow[]>(() => {
    const map = new Map<string, MergedCatalogRow>();
    const ownerSets = new Map<string, Set<string>>();

    const addUsage = (itemName: string, ownerLabel: string) => {
      const cleanName = itemName.trim();
      if (!cleanName) return;
      const key = normalizeItemKey(cleanName);
      if (!map.has(key)) {
        const cat = db.itemCatalog?.[key];
        map.set(key, {
          key,
          name: cat?.name || cleanName,
          icon: cat?.icon || '',
          owners: [],
        });
        ownerSets.set(key, new Set());
      }
      ownerSets.get(key)!.add(ownerLabel);
    };

    db.characters.forEach((char) => {
      char.items.forEach((item) => addUsage(item.name, char.character.name));
    });

    db.clans.forEach((clan) => {
      clan.items.forEach((item) => addUsage(item.name, `Clan ${clan.name}`));
    });

    Object.values(db.itemCatalog || {}).forEach((entry) => {
      if (!map.has(entry.key)) {
        map.set(entry.key, {
          key: entry.key,
          name: entry.name,
          icon: entry.icon,
          owners: [],
        });
        ownerSets.set(entry.key, new Set());
      } else {
        const existing = map.get(entry.key)!;
        existing.icon = entry.icon;
      }
    });

    map.forEach((row, key) => {
      row.owners = Array.from(ownerSets.get(key) || []);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.icon && !b.icon) return -1;
      if (!a.icon && b.icon) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [db.characters, db.clans, db.itemCatalog]);

  const counts = useMemo(() => {
    const linked = mergedRows.filter((r) => Boolean(r.icon)).length;
    const missing = mergedRows.length - linked;
    return {total: mergedRows.length, linked, missing};
  }, [mergedRows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mergedRows.filter((row) => {
      if (filterMode === 'linked' && !row.icon) return false;
      if (filterMode === 'missing' && Boolean(row.icon)) return false;
      if (q) {
        const hay = `${row.name} ${row.icon} ${row.owners.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [mergedRows, filterMode, query]);

  const handleSaveRow = (row: MergedCatalogRow) => {
    const raw =
      draftIcons[row.key] !== undefined ? draftIcons[row.key] : row.icon;
    onUpsertCatalogEntry(row.name, raw);
    setDraftIcons((prev) => {
      const next = {...prev};
      delete next[row.key];
      return next;
    });
    setJustSavedKey(row.key);
    setTimeout(() => {
      setJustSavedKey((curr) => (curr === row.key ? null : curr));
    }, 1500);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIcon.trim()) return;
    onUpsertCatalogEntry(newName.trim(), newIcon.trim());
    setNewName('');
    setNewIcon('');
  };

  const handleBulkImport = () => {
    const trimmed = bulkText.trim();
    if (!trimmed) return;

    const entries: {name: string; icon: string}[] = [];

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach((row) => {
            if (row && typeof row.name === 'string' && typeof row.icon === 'string') {
              entries.push({name: row.name, icon: row.icon});
            }
          });
        } else if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'string') {
              entries.push({name: k, icon: v});
            }
          });
        }
      } catch {
        setBulkResultMsg('JSON inválido. Prueba usando líneas tipo: Nombre = archivo.png');
        return;
      }
    } else {
      trimmed.split('\n').forEach((line) => {
        const clean = line.trim();
        if (!clean) return;
        const match = clean.match(/^(.+?)\s*(?:=|\||\t|;)\s*(.+)$/);
        if (match) {
          entries.push({name: match[1].trim(), icon: match[2].trim()});
        }
      });
    }

    if (entries.length === 0) {
      setBulkResultMsg(
        'No se detectaron pares válidos. Usa "Nombre = icono.png" o JSON.'
      );
      return;
    }

    onBulkUpsertCatalog(entries);
    setBulkText('');
    setBulkResultMsg(`Se guardaron ${entries.length} ítems en la base de datos.`);
  };

  return (
    <div className="space-y-5">
      {/* Header & Base URL */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
              Base de datos de ítems e imágenes
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Asocia el nombre exacto de cada ítem con su icono. Todos tus personajes, clanes y el buscador cargarán la imagen automáticamente desde esta tabla.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-mono tabular-nums text-slate-300">
              {counts.linked} con imagen
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-amber-400">
              {counts.missing} sin imagen
            </span>
            <button
              type="button"
              onClick={() => {
                setShowBulkPanel((v) => !v);
                setBulkResultMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-slate-200 font-medium whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{showBulkPanel ? 'Cerrar lote' : 'Importar lista'}</span>
            </button>
          </div>
        </div>

        {/* Base URL Config */}
        <div className="pt-3 border-t border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <label
              htmlFor="icon-base-url"
              className="text-xs text-slate-400 whitespace-nowrap"
            >
              URL base de iconos:
            </label>
            <input
              id="icon-base-url"
              type="text"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              className="flex-1 min-w-[240px] max-w-md bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                onSetIconBaseUrl(baseUrlInput);
                setSavedBaseUrl(true);
                setTimeout(() => setSavedBaseUrl(false), 1800);
              }}
              className="px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              {savedBaseUrl ? 'Guardada' : 'Guardar URL'}
            </button>
            <button
              type="button"
              onClick={() => {
                setBaseUrlInput(DEFAULT_ICON_BASE_URL);
                onSetIconBaseUrl(DEFAULT_ICON_BASE_URL);
              }}
              title="Restaurar https://l2j.ru/img/icons/"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>l2j.ru</span>
            </button>
          </div>
        </div>

        {/* Add single new item form */}
        <form
          onSubmit={handleAddSingle}
          className="pt-3 border-t border-[#1E293B] flex flex-col md:flex-row md:items-center gap-2.5"
        >
          <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
            Añadir manual:
          </span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre exacto del ítem (ej. Academy Circlet)"
            className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />
          <input
            type="text"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            placeholder="Icono o URL (ej. armor_helmet_i00.png)"
            className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!newName.trim() || !newIcon.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-[#1E293B] disabled:text-slate-500 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Guardar ítem</span>
          </button>
        </form>

        {/* Optional Bulk Import Panel */}
        {showBulkPanel && (
          <div className="pt-3 border-t border-[#1E293B] space-y-2.5">
            <div className="text-xs text-slate-300">
              Pega varias líneas con el formato <code className="text-amber-300">Nombre del ítem = nombre_icono.png</code> (o URL completa), o un JSON <code className="text-amber-300">{`{"Adena": "etc_adena_i00.png"}`}</code>:
            </div>
            <textarea
              rows={5}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Academy Circlet = https://l2j.ru/img/icons/armor_helmet_i00.png\nAdena = etc_adena_i00.png`}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md p-3 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {bulkResultMsg ? (
                <span className="text-xs text-amber-300">{bulkResultMsg}</span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Se admiten separadores =, |, ; o tabulador.
                </span>
              )}
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-4 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                Importar a la base de datos
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Filters & Catalog Table */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md w-fit">
            {(
              [
                ['all', `Todos (${counts.total})`],
                ['missing', `Sin imagen (${counts.missing})`],
                ['linked', `Con imagen (${counts.linked})`],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilterMode(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  filterMode === val
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar objeto o icono..."
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            No hay ítems que coincidan con este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                  <th className="py-2.5 pl-4 pr-3 w-12">Vista</th>
                  <th className="py-2.5 px-3">Nombre del ítem</th>
                  <th className="py-2.5 px-3">Presente en</th>
                  <th className="py-2.5 px-3">Archivo de icono o URL</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-xs">
                {filteredRows.map((row) => {
                  const currentInput =
                    draftIcons[row.key] !== undefined
                      ? draftIcons[row.key]
                      : row.icon;
                  const normalizedCurrent = normalizeIconInput(
                    currentInput,
                    db.iconBaseUrl
                  );
                  const isDirty =
                    draftIcons[row.key] !== undefined &&
                    normalizedCurrent !== row.icon;
                  const previewCatalog = {
                    ...db.itemCatalog,
                    [row.key]: {
                      key: row.key,
                      name: row.name,
                      icon: currentInput,
                      updatedAt: '',
                    },
                  };

                  return (
                    <tr
                      key={row.key}
                      className="hover:bg-[#161F30]/40 transition-colors"
                    >
                      <td className="py-2 pl-4 pr-3">
                        <ItemIcon
                          name={row.name}
                          itemCatalog={previewCatalog}
                          iconBaseUrl={db.iconBaseUrl}
                          size="sm"
                        />
                      </td>

                      <td className="py-2 px-3 font-medium text-slate-100">
                        {row.name}
                      </td>

                      <td className="py-2 px-3 text-slate-400">
                        {row.owners.length > 0
                          ? row.owners.slice(0, 3).join(', ') +
                            (row.owners.length > 3
                              ? ` +${row.owners.length - 3}`
                              : '')
                          : 'Solo catálogo'}
                      </td>

                      <td className="py-2 px-3 min-w-[260px]">
                        <input
                          type="text"
                          value={currentInput}
                          onChange={(e) =>
                            setDraftIcons((prev) => ({
                              ...prev,
                              [row.key]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveRow(row);
                            }
                          }}
                          placeholder="armor_helmet_i00.png o URL..."
                          className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      <td className="py-2 pl-3 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {justSavedKey === row.key ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <Check className="w-3.5 h-3.5" />
                              <span>Guardado</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!isDirty && Boolean(row.icon)}
                              onClick={() => handleSaveRow(row)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                isDirty || (!row.icon && currentInput.trim())
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                  : 'text-slate-500'
                              }`}
                            >
                              Guardar
                            </button>
                          )}

                          {row.icon && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpsertCatalogEntry(row.name, '');
                                setDraftIcons((prev) => {
                                  const next = {...prev};
                                  delete next[row.key];
                                  return next;
                                });
                              }}
                              aria-label={`Quitar icono de ${row.name}`}
                              className="p-1 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
