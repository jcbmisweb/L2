import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  ARMOR_SETS_CATALOG,
  ArmorSetAnalysis,
  GRADE_LABELS_ES,
  GRADE_ORDER,
  analyzeArmorSets,
} from '../data/armorSets';
import {L2Database} from '../types/l2';
import {ItemArmorType, ItemGradeCategory, LOCATION_LABELS} from '../utils/storage';
import {ArmorArtwork} from './ArmorArtwork';

interface ArmorSetsViewProps {
  db: L2Database;
  selectedServer: string;
  onSelectCharacter: (id: string) => void;
  onSelectClan: (id: string) => void;
  onSetArmorImage: (setId: string, imageUrl: string | null) => void;
}

const GRADE_ACCENT: Record<ItemGradeCategory, string> = {
  S84: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  S80: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  S: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  A: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  B: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  C: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  D: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300',
  'No-Grade': 'border-slate-600 bg-[#0B0F17] text-slate-300',
};

const ARMOR_TYPE_LABEL: Record<ItemArmorType, string> = {
  'Heavy Armor': 'HEAVY',
  'Light Armor': 'LIGHT',
  Robe: 'ROBE',
};

const ARMOR_TYPE_TEXT_COLOR: Record<ItemArmorType, string> = {
  'Heavy Armor': 'text-amber-300',
  'Light Armor': 'text-emerald-300',
  Robe: 'text-sky-300',
};

async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no válido.'));
      img.onload = () => {
        const maxH = 380;
        const maxW = 300;
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
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
        const webp = canvas.toDataURL('image/webp', 0.82);
        if (webp.startsWith('data:image/webp')) {
          resolve(webp);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ArmorSetsView({
  db,
  selectedServer,
  onSelectCharacter,
  onSelectClan,
  onSetArmorImage,
}: ArmorSetsViewProps) {
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | ItemGradeCategory>('all');
  const [armorTypeFilter, setArmorTypeFilter] = useState<'all' | ItemArmorType>('all');
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [includeSealed, setIncludeSealed] = useState(true);
  const [includeCommon, setIncludeCommon] = useState(false);
  const [expandedLooseIds, setExpandedLooseIds] = useState<Record<string, boolean>>({});
  const [photoModalSetId, setPhotoModalSetId] = useState<string | null>(null);
  const [photoUrlDraft, setPhotoUrlDraft] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyses = useMemo(
    () =>
      analyzeArmorSets(db, {
        selectedServer,
        includeSealed,
        includeCommon,
      }),
    [db, selectedServer, includeSealed, includeCommon]
  );

  const kpis = useMemo(() => {
    let totalComplete = 0;
    let totalLoose = 0;
    let totalAssemblable = 0;
    analyses.forEach((a) => {
      totalComplete += a.completeCount;
      totalLoose += a.totalLoosePieces;
      totalAssemblable += a.assemblableExtraCount;
    });
    const customPhotos = Object.keys(db.armorSetImages || {}).length;
    return {
      totalComplete,
      totalLoose,
      totalAssemblable,
      customPhotos,
      totalSets: ARMOR_SETS_CATALOG.length,
    };
  }, [analyses, db.armorSetImages]);

  const filteredAnalyses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analyses.filter((a) => {
      if (gradeFilter !== 'all' && a.set.grade !== gradeFilter) return false;
      if (armorTypeFilter !== 'all' && a.set.armorType !== armorTypeFilter) {
        return false;
      }
      if (onlyOwned && a.completeCount === 0 && a.totalLoosePieces === 0) {
        return false;
      }
      if (q) {
        const ownersText = a.completeOwners
          .map((o) => `${o.ownerName} ${o.accountName || ''}`)
          .join(' ');
        const looseText = a.looseSlots
          .flatMap((s) => [
            s.canonicalName,
            ...s.occurrences.map((o) => `${o.ownerName} ${o.itemName}`),
          ])
          .join(' ');
        const hay = `${a.set.name} ${a.set.family} ${a.set.grade} ${a.set.armorType} ${ownersText} ${looseText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [analyses, gradeFilter, armorTypeFilter, onlyOwned, query]);

  // Group filtered sets by Grade -> Family
  const gradeGroups = useMemo(() => {
    const byGrade = new Map<
      ItemGradeCategory,
      Map<string, ArmorSetAnalysis[]>
    >();

    GRADE_ORDER.forEach((g) => byGrade.set(g, new Map()));

    filteredAnalyses.forEach((item) => {
      const famMap = byGrade.get(item.set.grade)!;
      if (!famMap.has(item.set.family)) {
        famMap.set(item.set.family, []);
      }
      famMap.get(item.set.family)!.push(item);
    });

    return GRADE_ORDER.map((grade) => {
      const famMap = byGrade.get(grade)!;
      const families = Array.from(famMap.entries()).map(([family, sets]) => ({
        family,
        sets,
      }));
      const gradeComplete = families.reduce(
        (sum, f) => sum + f.sets.reduce((s, x) => s + x.completeCount, 0),
        0
      );
      const gradeLoose = families.reduce(
        (sum, f) => sum + f.sets.reduce((s, x) => s + x.totalLoosePieces, 0),
        0
      );
      return {
        grade,
        families,
        gradeComplete,
        gradeLoose,
      };
    }).filter((g) => g.families.length > 0);
  }, [filteredAnalyses]);

  const activePhotoSet = useMemo(
    () =>
      photoModalSetId
        ? ARMOR_SETS_CATALOG.find((s) => s.id === photoModalSetId) || null
        : null,
    [photoModalSetId]
  );

  const openPhotoModal = (setId: string) => {
    setPhotoModalSetId(setId);
    const existing = db.armorSetImages?.[setId] || '';
    setPhotoUrlDraft(existing.startsWith('data:') ? '' : existing);
    setPhotoError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoModalSetId) return;
    setPhotoError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      onSetArmorImage(photoModalSetId, dataUrl);
      setPhotoModalSetId(null);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Error al procesar la imagen.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleLoose = (setId: string) => {
    setExpandedLooseIds((prev) => ({...prev, [setId]: !prev[setId]}));
  };

  return (
    <div className="space-y-5">
      {/* Header & KPI Strip */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E293B] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
              Colección de Armaduras (Sin Grado a S84)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Control de equipos completos por personaje/clan, piezas sueltas ubicadas y fotos por tipo Heavy, Light y Robe.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Haz clic en la cámara de cualquier tarjeta para subir tu propia captura</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]">
          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Equipos completos</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-400">
              {kpis.totalComplete}
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Piezas sueltas</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-400">
              {kpis.totalLoose}
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Armables combinando sueltas</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-sky-400">
              {kpis.totalAssemblable}
            </div>
          </div>

          <div className="px-4 py-3.5">
            <div className="text-xs text-slate-400">Fotos personalizadas</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
              {kpis.customPhotos}
              <span className="text-xs text-slate-500 font-normal ml-1">
                / {kpis.totalSets}
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
              placeholder="Buscar armadura, pieza o dueño (ej. Vorpal, Blue Wolf, Avadon, Mildret...)"
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
            {(
              [
                ['all', 'Todos'],
                ['Heavy Armor', 'Heavy'],
                ['Light Armor', 'Light'],
                ['Robe', 'Robe'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setArmorTypeFilter(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  armorTypeFilter === val
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade pills + toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGradeFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                gradeFilter === 'all'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos los grados
            </button>
            {GRADE_ORDER.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                  gradeFilter === g
                    ? GRADE_ACCENT[g]
                    : 'bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200'
                }`}
              >
                {g === 'No-Grade' ? 'NG' : g}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOwned}
                onChange={(e) => setOnlyOwned(e.target.checked)}
                className="rounded border-[#334155] bg-[#0B0F17] text-amber-500 focus:ring-amber-500"
              />
              <span>Solo con piezas o completos</span>
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
        </div>
      </section>

      {/* Armor Matrix Grouped by Grade -> Family -> Heavy / Light / Robe */}
      {gradeGroups.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-12 text-center space-y-2">
          <p className="text-sm text-slate-300">
            Ninguna armadura coincide con los filtros actuales.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setGradeFilter('all');
              setArmorTypeFilter('all');
              setOnlyOwned(false);
            }}
            className="text-xs text-amber-400 hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {gradeGroups.map((group) => (
            <section key={group.grade} className="space-y-3">
              {/* Grade Section Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#111827] border border-[#1E293B] rounded-lg">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-[3px] border font-mono text-xs font-bold ${GRADE_ACCENT[group.grade]}`}
                  >
                    {group.grade === 'No-Grade' ? 'NG' : group.grade}
                  </span>
                  <h2 className="font-display text-base font-bold text-slate-100">
                    {GRADE_LABELS_ES[group.grade]}
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <span className="text-emerald-400">
                    {group.gradeComplete} completo{group.gradeComplete === 1 ? '' : 's'}
                  </span>
                  <span className="text-amber-400">
                    {group.gradeLoose} pieza{group.gradeLoose === 1 ? '' : 's'} suelta
                    {group.gradeLoose === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Families Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {group.families.map((fam) => (
                  <div
                    key={`${group.grade}-${fam.family}`}
                    className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden flex flex-col"
                  >
                    {/* Family Header */}
                    <div className="px-4 py-2.5 bg-[#161F30]/80 border-b border-[#1E293B] flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-slate-100">
                        {fam.family}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {GRADE_LABELS_ES[group.grade]}
                      </span>
                    </div>

                    {/* Side-by-side Columns: Heavy / Light / Robe */}
                    <div
                      className={`grid divide-y sm:divide-y-0 sm:divide-x divide-[#1E293B] flex-1 ${
                        fam.sets.length === 1
                          ? 'grid-cols-1'
                          : fam.sets.length === 2
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-1 sm:grid-cols-3'
                      }`}
                    >
                      {fam.sets.map((analysis) => {
                        const {set} = analysis;
                        const customPhoto = db.armorSetImages?.[set.id];
                        const isLooseExpanded = Boolean(expandedLooseIds[set.id]);

                        return (
                          <div key={set.id} className="flex flex-col">
                            {/* Column Type Header */}
                            <div className="px-3 py-1.5 bg-[#0B0F17]/70 border-b border-[#1E293B] flex items-center justify-between gap-2">
                              <span
                                className={`font-display text-xs font-bold tracking-wider uppercase ${ARMOR_TYPE_TEXT_COLOR[set.armorType]}`}
                              >
                                {ARMOR_TYPE_LABEL[set.armorType]}
                              </span>
                              {fam.sets.some((x) => x.set.name !== fam.family) && (
                                <span className="text-[11px] text-slate-400 truncate">
                                  {set.name}
                                </span>
                              )}
                            </div>

                            {/* Portrait Image */}
                            <div className="relative h-44 bg-[#0B0F17] border-b border-[#1E293B] group overflow-hidden">
                              <ArmorArtwork
                                armorType={set.armorType}
                                grade={set.grade}
                                palette={set.palette}
                                customImageUrl={customPhoto}
                                setName={set.name}
                              />
                              <button
                                type="button"
                                onClick={() => openPhotoModal(set.id)}
                                title={
                                  customPhoto
                                    ? 'Cambiar o quitar foto personalizada'
                                    : 'Subir foto del personaje con esta armadura'
                                }
                                className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B0F17]/90 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-[#334155] hover:border-amber-400 text-[11px] font-medium transition-colors"
                              >
                                <Camera className="w-3 h-3" />
                                <span>{customPhoto ? 'Foto' : 'Subir foto'}</span>
                              </button>
                            </div>

                            {/* Complete Count Strip (matching spreadsheet bar) */}
                            <div className="px-3 py-2 bg-[#161F30]/60 border-b border-[#1E293B] flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-1.5">
                                <span
                                  className={`font-mono text-base font-bold tabular-nums ${
                                    analysis.completeCount > 0
                                      ? 'text-emerald-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {analysis.completeCount}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  completo{analysis.completeCount === 1 ? '' : 's'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                                {analysis.assemblableExtraCount > 0 && (
                                  <span
                                    title="Se puede armar otro set completo combinando piezas sueltas entre personajes/clanes"
                                    className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300"
                                  >
                                    +{analysis.assemblableExtraCount} armable
                                  </span>
                                )}
                                <span
                                  className={
                                    analysis.totalLoosePieces > 0
                                      ? 'text-amber-300'
                                      : 'text-slate-500'
                                  }
                                >
                                  {analysis.totalLoosePieces} suelta
                                  {analysis.totalLoosePieces === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>

                            {/* Owners of Complete Sets */}
                            <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-medium text-slate-400">
                                  Quién lo tiene completo
                                </div>
                                {analysis.completeOwners.length === 0 ? (
                                  <div className="text-[11px] text-slate-500 italic">
                                    Ninguno completo en un mismo dueño
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {analysis.completeOwners.map((owner) => (
                                      <button
                                        key={`${owner.ownerType}-${owner.ownerId}`}
                                        type="button"
                                        onClick={() =>
                                          owner.ownerType === 'character'
                                            ? onSelectCharacter(owner.ownerId)
                                            : onSelectClan(owner.ownerId)
                                        }
                                        className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1E293B] hover:border-emerald-500/50 text-left transition-colors"
                                      >
                                        <span className="flex items-center gap-1.5 min-w-0">
                                          {owner.ownerType === 'clan' ? (
                                            <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                                          ) : (
                                            <User className="w-3 h-3 text-emerald-400 shrink-0" />
                                          )}
                                          <span className="font-medium text-slate-100 truncate">
                                            {owner.ownerType === 'clan'
                                              ? `Clan ${owner.ownerName}`
                                              : owner.ownerName}
                                          </span>
                                          {owner.hasSealed && (
                                            <span className="text-[10px] font-mono text-amber-400 shrink-0">
                                              (Sealed)
                                            </span>
                                          )}
                                        </span>
                                        <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                                          ×{owner.count}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Loose Pieces Checklist & Locations */}
                              <div className="pt-2 border-t border-[#1E293B]/80 space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleLoose(set.id)}
                                  className="w-full flex items-center justify-between text-[11px] font-medium text-slate-400 hover:text-amber-300 transition-colors"
                                >
                                  <span className="flex items-center gap-1">
                                    {isLooseExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                    <span>Piezas ({set.pieces.length}) y sueltas</span>
                                  </span>
                                  {analysis.totalLoosePieces > 0 && (
                                    <span className="font-mono text-amber-300">
                                      Ver ubicaciones
                                    </span>
                                  )}
                                </button>

                                {/* Compact Slot Pills Summary */}
                                <div className="grid grid-cols-1 gap-1">
                                  {analysis.looseSlots.map((slotInfo) => (
                                    <div
                                      key={slotInfo.slot}
                                      className="flex flex-col bg-[#0B0F17]/70 rounded px-2 py-1 border border-[#1E293B]/70"
                                    >
                                      <div className="flex items-center justify-between gap-2 text-[11px]">
                                        <span className="text-slate-300 truncate" title={slotInfo.canonicalName}>
                                          <span className="text-slate-500 mr-1">
                                            {slotInfo.label}:
                                          </span>
                                          {slotInfo.canonicalName}
                                        </span>
                                        <span
                                          className={`font-mono font-semibold shrink-0 ${
                                            slotInfo.totalQty > 0
                                              ? 'text-amber-400'
                                              : 'text-slate-600'
                                          }`}
                                        >
                                          {slotInfo.totalQty > 0
                                            ? `+${slotInfo.totalQty}`
                                            : '0'}
                                        </span>
                                      </div>

                                      {/* Expanded exact locations for loose pieces */}
                                      {isLooseExpanded &&
                                        slotInfo.occurrences.length > 0 && (
                                          <div className="mt-1 pt-1 border-t border-[#1E293B]/70 space-y-1">
                                            {slotInfo.occurrences.map((occ, idx) => (
                                              <button
                                                key={`${occ.ownerId}-${occ.location}-${idx}`}
                                                type="button"
                                                onClick={() =>
                                                  occ.ownerType === 'character'
                                                    ? onSelectCharacter(occ.ownerId)
                                                    : onSelectClan(occ.ownerId)
                                                }
                                                className="w-full flex items-center justify-between gap-2 text-[10px] text-left text-slate-300 hover:text-amber-300 transition-colors"
                                              >
                                                <span className="truncate">
                                                  {occ.ownerType === 'clan'
                                                    ? `Clan ${occ.ownerName}`
                                                    : occ.ownerName}{' '}
                                                  <span className="text-slate-500">
                                                    · {LOCATION_LABELS[occ.location]}
                                                  </span>
                                                  {occ.isSealed && (
                                                    <span className="text-amber-400 ml-1">
                                                      [Sealed]
                                                    </span>
                                                  )}
                                                  {occ.isCommon && (
                                                    <span className="text-sky-400 ml-1">
                                                      [Common]
                                                    </span>
                                                  )}
                                                </span>
                                                <span className="font-mono text-amber-300 shrink-0">
                                                  ×{occ.remainingQty}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                    </div>
                                  ))}
                                </div>

                                {analysis.commonSkippedCount > 0 && !includeCommon && (
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                                    <Package className="w-3 h-3" />
                                    <span>
                                      {analysis.commonSkippedCount} pieza
                                      {analysis.commonSkippedCount === 1 ? '' : 's'} Common Item oculta
                                      {analysis.commonSkippedCount === 1 ? '' : 's'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Photo Upload / URL Modal */}
      {activePhotoSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="armor-photo-modal-title"
            className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B]">
              <h2
                id="armor-photo-modal-title"
                className="font-display text-sm font-semibold text-slate-100 truncate pr-3"
              >
                Foto de armadura: {activePhotoSet.name}
              </h2>
              <button
                type="button"
                onClick={() => setPhotoModalSetId(null)}
                aria-label="Cerrar"
                className="p-1 text-slate-400 hover:text-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="h-48 rounded-md border border-[#1E293B] overflow-hidden bg-[#0B0F17]">
                <ArmorArtwork
                  armorType={activePhotoSet.armorType}
                  grade={activePhotoSet.grade}
                  palette={activePhotoSet.palette}
                  customImageUrl={
                    photoUrlDraft.trim() ||
                    db.armorSetImages?.[activePhotoSet.id]
                  }
                  setName={activePhotoSet.name}
                />
              </div>

              {photoError && (
                <div className="px-3 py-2 rounded border border-red-800/60 bg-red-950/40 text-red-300">
                  {photoError}
                </div>
              )}

              {/* Local File Upload */}
              <div className="space-y-2">
                <div className="font-medium text-slate-200">
                  Subir captura o foto desde tu ordenador
                </div>
                <p className="text-[11px] text-slate-400">
                  La imagen se optimiza automáticamente y se guarda en tu base local (también se incluye al descargar el respaldo JSON).
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
                  <span>Elegir foto o captura...</span>
                </button>
              </div>

              {/* Or URL */}
              <div className="pt-3 border-t border-[#1E293B] space-y-2">
                <label
                  htmlFor="armor-photo-url"
                  className="block font-medium text-slate-300"
                >
                  O pegar URL de imagen externa
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="armor-photo-url"
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
                      onSetArmorImage(activePhotoSet.id, photoUrlDraft.trim());
                      setPhotoModalSetId(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] disabled:opacity-40 border border-[#283548] text-slate-200 font-medium whitespace-nowrap shrink-0"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Usar URL</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
                {db.armorSetImages?.[activePhotoSet.id] ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSetArmorImage(activePhotoSet.id, null);
                      setPhotoModalSetId(null);
                    }}
                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Restaurar ilustración</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Sparkles className="w-3 h-3" />
                    <span>Usando ilustración generada</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setPhotoModalSetId(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-slate-300 hover:bg-[#161F30]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 opacity-0" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
