import {ExternalLink, Package, Trash2, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {CharacterRecord, ClanRecord, ItemCatalogEntry} from '../types/l2';
import {
  DEFAULT_ICON_BASE_URL,
  LOCATION_LABELS,
  normalizeIconInput,
  normalizeItemKey,
  resolveItemIconUrl,
} from '../utils/storage';

interface QuickIconModalProps {
  itemName: string | null;
  itemCatalog: Record<string, ItemCatalogEntry>;
  iconBaseUrl: string;
  characters?: CharacterRecord[];
  clans?: ClanRecord[];
  onClose: () => void;
  onSave: (name: string, rawIcon: string) => void;
  onDeleteItemGlobally?: (name: string) => void;
}

export function QuickIconModal({
  itemName,
  itemCatalog,
  iconBaseUrl,
  characters = [],
  clans = [],
  onClose,
  onSave,
  onDeleteItemGlobally,
}: QuickIconModalProps) {
  const [iconInput, setIconInput] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!itemName) return;
    const entry = itemCatalog?.[normalizeItemKey(itemName)];
    setIconInput(entry?.icon || '');
    setPreviewFailed(false);
    setConfirmDelete(false);
  }, [itemName, itemCatalog]);

  const itemOwners = useMemo(() => {
    if (!itemName) return [];
    const targetKey = normalizeItemKey(itemName);
    const list: string[] = [];

    characters.forEach((c) => {
      const locs = new Set<string>();
      c.items.forEach((it) => {
        if (normalizeItemKey(it.name) === targetKey) {
          locs.add(LOCATION_LABELS[it.location] || it.location);
        }
      });
      if (locs.size > 0) {
        list.push(`${c.character.name} (${Array.from(locs).join(', ')})`);
      }
    });

    clans.forEach((cl) => {
      if (cl.items.some((it) => normalizeItemKey(it.name) === targetKey)) {
        list.push(`Clan ${cl.name}`);
      }
    });

    return list;
  }, [itemName, characters, clans]);

  if (!itemName) return null;

  const base = iconBaseUrl || DEFAULT_ICON_BASE_URL;
  const previewUrl = resolveItemIconUrl(iconInput, base);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(itemName, iconInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-icon-title"
        className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B]">
          <h2
            id="quick-icon-title"
            className="font-display text-sm font-semibold text-slate-100 truncate pr-3"
          >
            Imagen del objeto
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 text-slate-400 hover:text-slate-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="flex items-center gap-3.5 bg-[#0B0F17] border border-[#1E293B] rounded-md p-3">
            {previewUrl && !previewFailed ? (
              <img
                src={previewUrl}
                alt={itemName}
                referrerPolicy="no-referrer"
                onError={() => setPreviewFailed(true)}
                className="w-10 h-10 object-cover rounded border border-[#283548] bg-[#111827] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center rounded border border-[#1E293B] bg-[#111827] text-slate-500 shrink-0">
                <Package className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="font-medium text-sm text-slate-100 truncate">
                {itemName}
              </div>
              <div className="font-mono text-[11px] text-slate-400 truncate mt-0.5">
                {previewUrl || 'Sin imagen asignada'}
              </div>
              {itemOwners.length > 0 && (
                <div className="text-[11px] text-sky-300/90 mt-1 leading-snug">
                  En: {itemOwners.slice(0, 4).join(' · ')}
                  {itemOwners.length > 4 ? ` (+${itemOwners.length - 4})` : ''}
                </div>
              )}
              {previewFailed && previewUrl && (
                <div className="text-[11px] text-amber-300 mt-0.5">
                  No se pudo cargar esa imagen. Comprueba el nombre o la URL.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quick-icon-input"
              className="block font-medium text-slate-300"
            >
              Nombre del icono o URL completa
            </label>
            <input
              id="quick-icon-input"
              type="text"
              autoFocus
              value={iconInput}
              onChange={(e) => {
                setIconInput(e.target.value);
                setPreviewFailed(false);
              }}
              placeholder="Ej. armor_helmet_i00.png o https://l2j.ru/img/icons/..."
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-400">
              Si escribes solo el nombre del archivo (ej.{' '}
              <code className="text-slate-300">armor_helmet_i00.png</code>), se combinará automáticamente con{' '}
              <code className="text-slate-300">{base}</code>.
            </p>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline pt-0.5"
              >
                <span>Abrir imagen en nueva pestaña</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E293B]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSave(itemName, '');
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-slate-400 hover:text-amber-300"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar enlace</span>
              </button>

              {onDeleteItemGlobally &&
                (!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-red-400 hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar ítem</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteItemGlobally(itemName);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold"
                    >
                      Sí, eliminar todo
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 rounded text-slate-400 hover:text-slate-200"
                    >
                      No
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-slate-300 hover:bg-[#161F30]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Guardar ({normalizeIconInput(iconInput, base) || 'vacío'})
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
