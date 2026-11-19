import {
  Camera,
  ImagePlus,
  Package,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';
import {
  EPIC_JEWELS_CATALOG,
  EpicCategory,
  EpicJewelDef,
  analyzeEpicJewels,
} from '../data/epicJewels';
import {L2Database} from '../types/l2';
import {ItemGradeCategory, LOCATION_LABELS} from '../utils/storage';
import {EpicJewelArtwork} from './EpicJewelArtwork';

interface EpicJewelsViewProps {
  db: L2Database;
  selectedServer: string;
  onSelectCharacter: (id: string) => void;
  onSelectClan: (id: string) => void;
  onSetJewelImage: (id: string, imageUrl: string | null) => void;
}

const CATEGORY_TABS: Array<{value: 'all' | EpicCategory; label: string}> = [
  {value: 'all', label: 'Todos'},
  {value: 'necklace', label: 'Collares'},
  {value: 'earring', label: 'Pendientes'},
  {value: 'ring', label: 'Anillos'},
  {value: 'shirt', label: 'Camisas'},
];

const GRADE_BOX_STYLE: Record<ItemGradeCategory, string> = {
  S84: 'border-amber-500/60 bg-amber-500/15 text-amber-300',
  S80: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  S: 'border-amber-400/50 bg-amber-500/10 text-amber-200',
  A: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
  B: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
  C: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  D: 'border-indigo-400/50 bg-indigo-500/10 text-indigo-300',
  'No-Grade': 'border-slate-600 bg-[#0B0F17] text-slate-300',
};

function renderGradeBoxes(grade: ItemGradeCategory) {
  if (grade === 'S84') {
    return (
      <span className="inline-flex items-center gap-0.5 shrink-0" title="Grado S84">
        <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[2px] border border-amber-500/60 bg-amber-500/15 font-mono text-[10px] font-bold leading-none text-amber-300">
          S
        </span>
        <span className="inline-flex items-center justify-center h-[16px] px-1 rounded-[2px] border border-amber-500/60 bg-amber-500/15 font-mono text-[10px] font-bold leading-none text-amber-300">
          84
        </span>
      </span>
    );
  }
  if (grade === 'S80') {
    return (
      <span className="inline-flex items-center gap-0.5 shrink-0" title="Grado S80">
        <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[2px] border border-amber-500/50 bg-amber-500/10 font-mono text-[10px] font-bold leading-none text-amber-300">
          S
        </span>
        <span className="inline-flex items-center justify-center h-[16px] px-1 rounded-[2px] border border-amber-500/50 bg-amber-500/10 font-mono text-[10px] font-bold leading-none text-amber-300">
          80
        </span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[2px] border font-mono text-[10px] font-bold leading-none shrink-0 ${GRADE_BOX_STYLE[grade]}`}
      title={`Grado ${grade}`}
    >
      {grade === 'No-Grade' ? 'NG' : grade}
    </span>
  );
}

async function compressJewelImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no válido.'));
      img.onload = () => {
        const maxSize = 256;
        const scale = Math.min(1, maxSize / img.width, maxSize / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL('image/webp', 0.85);
        if (webp.startsWith('data:image/webp')) {
          resolve(webp);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function EpicJewelsView({
  db,
  selectedServer,
  onSelectCharacter,
  onSelectClan,
  onSetJewelImage,
}: EpicJewelsViewProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EpicCategory>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [includeSealed, setIncludeSealed] = useState(true);
  const [includeCommon, setIncludeCommon] = useState(false);

  const [photoModalJewelId, setPhotoModalJewelId] = useState<string | null>(null);
  const [photoUrlDraft, setPhotoUrlDraft] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyses = useMemo(
    () =>
      analyzeEpicJewels(db, {
        selectedServer,
        includeSealed,
        includeCommon,
      }),
    [db, selectedServer, includeSealed, includeCommon]
  );

  const kpis = useMemo(() => {
    let totalJewels = 0;
    let obtainedTypes = 0;
    const distinctOwners = new Set<string>();
    let customPhotos = 0;

    analyses.forEach((entry) => {
      totalJewels += entry.totalCount;
      if (entry.totalCount > 0) obtainedTypes += 1;
      entry.owners.forEach((o) => {
        distinctOwners.add(`${o.ownerType}::${o.ownerId}`);
      });
      if (db.armorSetImages?.[entry.def.id]) {
        customPhotos += 1;
      }
    });

    return {
      totalJewels,
      obtainedTypes,
      totalTypes: EPIC_JEWELS_CATALOG.length,
      distinctOwnersCount: distinctOwners.size,
      customPhotos,
    };
  }, [analyses, db.armorSetImages]);

  const filteredAnalyses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analyses.filter((entry) => {
      if (categoryFilter !== 'all' && entry.def.category !== categoryFilter) {
        return false;
      }
      if (onlyAvailable && entry.totalCount === 0) {
        return false;
      }
      if (q) {
        const ownersHay = entry.owners
          .map((o) => `${o.ownerName} ${o.accountName || ''} ${o.itemName}`)
          .join(' ');
        const hay = `${entry.def.name} ${entry.def.subtitle || ''} ${entry.def.aliases.join(' ')} ${entry.def.grade} ${ownersHay}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [analyses, categoryFilter, onlyAvailable, query]);

  const activePhotoAnalysis = useMemo(() => {
    if (!photoModalJewelId) return null;
    return analyses.find((a) => a.def.id === photoModalJewelId) || null;
  }, [analyses, photoModalJewelId]);

  const openPhotoModal = (def: EpicJewelDef) => {
    setPhotoModalJewelId(def.id);
    const existing = db.armorSetImages?.[def.id] || '';
    setPhotoUrlDraft(existing.startsWith('data:') ? '' : existing);
    setPhotoError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoModalJewelId) return;
    setPhotoError(null);
    try {
      const dataUrl = await compressJewelImageToDataUrl(file);
      onSetJewelImage(photoModalJewelId, dataUrl);
      setPhotoModalJewelId(null);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Error al procesar la imagen.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & KPI Strip */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E293B] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
              Joyas Épicas y Equipamiento Especial
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Control de existencias de joyas de Boss (Valakas, Antharas, Baium, Zaken, Beleth, Freya, Frintezza, Queen Ant, Orfen, Core) y Striped Mithril Shirt con lista numerada de dueños.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Haz clic en la cámara de cada columna para subir su icono o imagen</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]">
          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Total joyas épicas</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-400">
              {kpis.totalJewels}
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Tipos conseguidos</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-400">
              {kpis.obtainedTypes}
              <span className="text-xs text-slate-500 font-normal ml-1">
                / {kpis.totalTypes}
              </span>
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Dueños con épicas</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-sky-400">
              {kpis.distinctOwnersCount}
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Fotos personalizadas</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
              {kpis.customPhotos}
              <span className="text-xs text-slate-500 font-normal ml-1">
                / {kpis.totalTypes}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar joya o dueño (ej. Valakas, Zaken, Baium, Freya, Queen Ant, Mildret...)"
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

          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md shrink-0 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCategoryFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === tab.value
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded border-[#334155] bg-[#0B0F17] text-amber-500 focus:ring-amber-500"
            />
            <span>Solo con existencias (&gt;0)</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSealed}
              onChange={(e) => setIncludeSealed(e.target.checked)}
              className="rounded border-[#334155] bg-[#0B0F17] text-amber-500 focus:ring-amber-500"
            />
            <span>Incluir Sealed</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCommon}
              onChange={(e) => setIncludeCommon(e.target.checked)}
              className="rounded border-[#334155] bg-[#0B0F17] text-amber-500 focus:ring-amber-500"
            />
            <span>Incluir Common Item</span>
          </label>
        </div>
      </section>

      {/* Spreadsheet-style Comparison Grid */}
      {filteredAnalyses.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-12 text-center space-y-2">
          <p className="text-sm text-slate-300">
            Ninguna joya coincide con los filtros actuales.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategoryFilter('all');
              setOnlyAvailable(false);
            }}
            className="text-xs text-amber-400 hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredAnalyses.map((entry) => {
            const {def, totalCount, owners, commonSkippedCount, catalogIconUrl} =
              entry;
            const customPhoto = db.armorSetImages?.[def.id];
            const hasStock = totalCount > 0;

            return (
              <article
                key={def.id}
                className={`bg-[#111827] border rounded-lg overflow-hidden flex flex-col transition-colors ${
                  hasStock ? 'border-[#2B3B54]' : 'border-[#1E293B]'
                }`}
              >
                {/* Icon / Artwork Header */}
                <div className="relative h-28 bg-[#0B0F17] border-b border-[#1E293B] group overflow-hidden">
                  <EpicJewelArtwork
                    def={def}
                    customImageUrl={customPhoto}
                    catalogIcon={catalogIconUrl}
                    iconBaseUrl={db.iconBaseUrl}
                  />
                  <button
                    type="button"
                    onClick={() => openPhotoModal(def)}
                    title={
                      customPhoto
                        ? 'Cambiar o restaurar imagen'
                        : 'Subir icono o imagen personalizada'
                    }
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B0F17]/85 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-[#334155] hover:border-amber-400 text-[11px] font-medium transition-all opacity-75 group-hover:opacity-100"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{customPhoto ? 'Cambiar' : 'Foto'}</span>
                  </button>
                </div>

                {/* Jewel Title + Grade */}
                <div className="px-3 py-2.5 bg-[#161F30]/80 border-b border-[#1E293B] min-h-[60px] flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-xs font-bold text-slate-100 leading-snug">
                      {def.name}
                    </h2>
                    {renderGradeBoxes(def.grade)}
                  </div>
                  {def.subtitle && (
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {def.subtitle}
                    </div>
                  )}
                </div>

                {/* Total Count Bar (like Excel green/olive row: 1, 2, 7 or No) */}
                <div
                  className={`px-3 py-2 border-b border-[#1E293B] flex items-center justify-between ${
                    hasStock ? 'bg-emerald-950/35' : 'bg-[#0B0F17]/60'
                  }`}
                >
                  <span className="text-[11px] font-medium text-slate-400">
                    Cantidad
                  </span>
                  {hasStock ? (
                    <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                      {totalCount}
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      No
                    </span>
                  )}
                </div>

                {/* Numbered Owners List (1, 2, 3...) */}
                <div className="flex-1 flex flex-col divide-y divide-[#1E293B]/70 text-xs">
                  {owners.length === 0 ? (
                    <div className="px-3 py-4 text-[11px] text-slate-500 italic text-center my-auto">
                      Sin existencias registradas
                    </div>
                  ) : (
                    owners.map((owner, idx) => (
                      <button
                        key={`${owner.ownerType}-${owner.ownerId}-${owner.location}-${idx}`}
                        type="button"
                        onClick={() =>
                          owner.ownerType === 'character'
                            ? onSelectCharacter(owner.ownerId)
                            : onSelectClan(owner.ownerId)
                        }
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#161F30] transition-colors group"
                      >
                        <span className="w-5 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-slate-500 text-right">
                          {idx + 1}.
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {owner.ownerType === 'clan' ? (
                              <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                            ) : (
                              <User className="w-3 h-3 text-emerald-400 shrink-0" />
                            )}
                            <span className="font-medium text-slate-100 group-hover:text-amber-300 truncate transition-colors">
                              {owner.ownerType === 'clan'
                                ? `Clan ${owner.ownerName}`
                                : owner.ownerName}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                            {owner.enchant !== null && owner.enchant > 0 && (
                              <span className="font-mono font-bold text-amber-400">
                                +{owner.enchant}
                              </span>
                            )}
                            {owner.variantLabel && (
                              <span className="px-1 py-0 rounded bg-sky-500/15 border border-sky-500/40 font-mono font-semibold text-sky-300">
                                {owner.variantLabel}
                              </span>
                            )}
                            <span className="text-slate-400">
                              {LOCATION_LABELS[owner.location]}
                            </span>
                            {owner.isSealed && (
                              <span className="text-amber-400 font-mono">
                                [Sealed]
                              </span>
                            )}
                            {owner.isCommon && (
                              <span className="text-sky-400 font-mono">
                                [Common]
                              </span>
                            )}
                          </div>
                        </div>

                        {owner.quantity > 1 && (
                          <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                            ×{owner.quantity}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {commonSkippedCount > 0 && !includeCommon && (
                  <div className="px-3 py-1.5 bg-[#0B0F17]/70 border-t border-[#1E293B] text-[10px] text-slate-500 flex items-center gap-1">
                    <Package className="w-3 h-3 shrink-0" />
                    <span>
                      {commonSkippedCount} Common Item oculto
                      {commonSkippedCount === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Photo Upload / URL Modal */}
      {activePhotoAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="epic-photo-modal-title"
            className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B]">
              <h2
                id="epic-photo-modal-title"
                className="font-display text-sm font-semibold text-slate-100 truncate pr-3"
              >
                Imagen de joya: {activePhotoAnalysis.def.name}
              </h2>
              <button
                type="button"
                onClick={() => setPhotoModalJewelId(null)}
                aria-label="Cerrar"
                className="p-1 text-slate-400 hover:text-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="h-40 rounded-md border border-[#1E293B] overflow-hidden bg-[#0B0F17]">
                <EpicJewelArtwork
                  def={activePhotoAnalysis.def}
                  customImageUrl={
                    photoUrlDraft.trim() ||
                    db.armorSetImages?.[activePhotoAnalysis.def.id]
                  }
                  catalogIcon={activePhotoAnalysis.catalogIconUrl}
                  iconBaseUrl={db.iconBaseUrl}
                />
              </div>

              {photoError && (
                <div className="px-3 py-2 rounded border border-red-800/60 bg-red-950/40 text-red-300">
                  {photoError}
                </div>
              )}

              <div className="space-y-2">
                <div className="font-medium text-slate-200">
                  Subir icono o captura desde tu ordenador
                </div>
                <p className="text-[11px] text-slate-400">
                  La imagen se optimiza automáticamente y se guarda en tu base local (incluida al descargar tu respaldo JSON).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Elegir imagen...</span>
                </button>
              </div>

              <div className="pt-3 border-t border-[#1E293B] space-y-2">
                <label
                  htmlFor="epic-photo-url"
                  className="block font-medium text-slate-300"
                >
                  O pegar URL de imagen externa
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="epic-photo-url"
                    type="text"
                    value={photoUrlDraft}
                    onChange={(e) => setPhotoUrlDraft(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={!photoUrlDraft.trim()}
                    onClick={() => {
                      onSetJewelImage(
                        activePhotoAnalysis.def.id,
                        photoUrlDraft.trim()
                      );
                      setPhotoModalJewelId(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] disabled:opacity-40 border border-[#283548] text-slate-200 font-medium whitespace-nowrap shrink-0"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Usar URL</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                {db.armorSetImages?.[activePhotoAnalysis.def.id] ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSetJewelImage(activePhotoAnalysis.def.id, null);
                      setPhotoModalJewelId(null);
                    }}
                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Restaurar imagen</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {activePhotoAnalysis.catalogIconUrl
                        ? 'Usando icono del catálogo'
                        : 'Usando ilustración generada'}
                    </span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setPhotoModalJewelId(null)}
                  className="px-3 py-1.5 rounded-md text-slate-300 hover:bg-[#161F30]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
