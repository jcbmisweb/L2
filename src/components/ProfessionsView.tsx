import {
  AlertTriangle,
  Download,
  GitFork,
  Search,
  User,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {
  ClassOccupancyEntry,
  PROFESSION_FAMILIES,
  ProfessionFamily,
  ProfessionNode,
  matchProfessionNode,
} from '../data/professionTree';
import {CharacterRecord} from '../types/l2';
import {buildCsv, downloadBlobFile} from '../utils/exportData';

interface ProfessionsViewProps {
  characters: CharacterRecord[];
  selectedServer: string;
  onSelectCharacter: (id: string) => void;
}

interface TreeCounts {
  directCount: number;
  subtreeCount: number;
}

export function ProfessionsView({
  characters,
  selectedServer,
  onSelectCharacter,
}: ProfessionsViewProps) {
  const [includeSubclasses, setIncludeSubclasses] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('all');

  const scopedCharacters = useMemo(() => {
    if (selectedServer === 'all') return characters;
    return characters.filter((c) => c.server === selectedServer);
  }, [characters, selectedServer]);

  const occupancy = useMemo(() => {
    const byNode = new Map<string, ClassOccupancyEntry[]>();
    const byFamily = new Map<string, ClassOccupancyEntry[]>();
    const unmatched: {character: CharacterRecord; reason: string}[] = [];

    const addEntry = (
      familyId: string,
      nodeId: string,
      entry: ClassOccupancyEntry
    ) => {
      if (!byNode.has(nodeId)) byNode.set(nodeId, []);
      byNode.get(nodeId)!.push(entry);
      if (!byFamily.has(familyId)) byFamily.set(familyId, []);
      byFamily.get(familyId)!.push(entry);
    };

    scopedCharacters.forEach((char) => {
      const mainClass = char.character.class;
      const mainMatch = matchProfessionNode(mainClass, char.character.race);

      if (mainMatch) {
        addEntry(mainMatch.familyId, mainMatch.nodeId, {
          character: char,
          role: 'main',
          rawClassName: mainClass || mainMatch.nodeName,
          level: char.character.level,
        });
      } else {
        unmatched.push({
          character: char,
          reason: mainClass
            ? `Clase no reconocida: "${mainClass}"`
            : char.status === 'pending'
            ? 'Pendiente de captura'
            : 'Sin clase asignada',
        });
      }

      if (includeSubclasses && char.character.subclasses?.length) {
        char.character.subclasses.forEach((sub, idx) => {
          if (!sub.class) return;
          const subMatch = matchProfessionNode(sub.class);
          if (subMatch) {
            addEntry(subMatch.familyId, subMatch.nodeId, {
              character: char,
              role: 'subclass',
              subIndex: sub.index || idx + 1,
              rawClassName: sub.class,
              level: sub.level,
            });
          }
        });
      }
    });

    // Sort entries inside each node by level desc then name asc
    byNode.forEach((list) =>
      list.sort((a, b) => {
        const lvlDiff = (b.level ?? 0) - (a.level ?? 0);
        if (lvlDiff !== 0) return lvlDiff;
        return a.character.character.name.localeCompare(
          b.character.character.name
        );
      })
    );

    return {byNode, byFamily, unmatched};
  }, [scopedCharacters, includeSubclasses]);

  const computeNodeTreeCounts = useMemo(() => {
    const cache = new Map<string, TreeCounts>();

    const walk = (node: ProfessionNode): TreeCounts => {
      const directCount = (occupancy.byNode.get(node.id) || []).length;
      let subtreeCount = directCount;
      (node.children || []).forEach((child) => {
        subtreeCount += walk(child).subtreeCount;
      });
      const res = {directCount, subtreeCount};
      cache.set(node.id, res);
      return res;
    };

    PROFESSION_FAMILIES.forEach((fam) => walk(fam.root));
    return cache;
  }, [occupancy.byNode]);

  const summaryStats = useMemo(() => {
    let activeFamilies = 0;
    let coveredProfessions = 0;
    let totalEntries = 0;

    PROFESSION_FAMILIES.forEach((fam) => {
      const count = (occupancy.byFamily.get(fam.id) || []).length;
      if (count > 0) activeFamilies++;
      totalEntries += count;
    });

    occupancy.byNode.forEach((list) => {
      if (list.length > 0) coveredProfessions++;
    });

    return {
      totalCharacters: scopedCharacters.length,
      activeFamilies,
      coveredProfessions,
      totalEntries,
      unmatchedCount: occupancy.unmatched.length,
    };
  }, [scopedCharacters.length, occupancy]);

  const nodeMatchesQuery = (
    node: ProfessionNode,
    qLower: string
  ): boolean => {
    if (!qLower) return true;
    if (node.name.toLowerCase().includes(qLower)) return true;
    if (
      (node.aliases || []).some((a) => a.toLowerCase().includes(qLower))
    ) {
      return true;
    }
    const entries = occupancy.byNode.get(node.id) || [];
    if (
      entries.some(
        (e) =>
          e.character.character.name.toLowerCase().includes(qLower) ||
          e.character.account.toLowerCase().includes(qLower)
      )
    ) {
      return true;
    }
    return (node.children || []).some((ch) => nodeMatchesQuery(ch, qLower));
  };

  const visibleFamilies = useMemo(() => {
    const qLower = query.trim().toLowerCase();
    return PROFESSION_FAMILIES.filter((fam) => {
      if (selectedFamilyId !== 'all' && fam.id !== selectedFamilyId) {
        return false;
      }
      const famCount = (occupancy.byFamily.get(fam.id) || []).length;
      if (onlyOwned && famCount === 0) return false;
      if (qLower && !nodeMatchesQuery(fam.root, qLower)) return false;
      return true;
    });
  }, [selectedFamilyId, onlyOwned, query, occupancy.byFamily]);

  const handleExportProfessionsCsv = () => {
    const headers = [
      'Familia',
      'Profesion',
      'Grado',
      'Total',
      'Personajes',
    ];
    const rows: (string | number)[][] = [];

    const walk = (fam: ProfessionFamily, node: ProfessionNode) => {
      const entries = occupancy.byNode.get(node.id) || [];
      const tierLabel =
        node.tier === 0
          ? 'Base'
          : node.tier === 1
          ? '1ª Profesión'
          : node.tier === 2
          ? '2ª Profesión'
          : '3ª Profesión';
      const charList = entries
        .map((e) => {
          const role =
            e.role === 'subclass' ? `Sub ${e.subIndex}` : 'Main';
          return `${e.character.character.name} (${role} Nv.${e.level ?? '?'} - ${
            e.character.account
          })`;
        })
        .join(' | ');

      rows.push([fam.name, node.name, tierLabel, entries.length, charList]);
      (node.children || []).forEach((c) => walk(fam, c));
    };

    PROFESSION_FAMILIES.forEach((fam) => walk(fam, fam.root));
    const csv = buildCsv(headers, rows, ';');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadBlobFile(
      `l2es-profesiones-familias-${dateStr}.csv`,
      csv,
      'text/csv;charset=utf-8',
      true
    );
  };

  const renderTreeNode = (
    node: ProfessionNode,
    depth: number,
    qLower: string
  ): React.ReactNode => {
    const counts = computeNodeTreeCounts.get(node.id) || {
      directCount: 0,
      subtreeCount: 0,
    };
    if (onlyOwned && counts.subtreeCount === 0) return null;
    if (qLower && !nodeMatchesQuery(node, qLower)) return null;

    const entries = occupancy.byNode.get(node.id) || [];
    const hasDirect = entries.length > 0;
    const isRoot = depth === 0;

    return (
      <div
        key={node.id}
        className={
          depth > 0 ? 'ml-3.5 pl-3 border-l border-[#1E293B]' : undefined
        }
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-2 py-1 px-2 rounded transition-colors ${
            hasDirect
              ? 'bg-amber-500/10 text-slate-100'
              : 'hover:bg-[#161F30]/60'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs ${
                hasDirect
                  ? 'font-semibold text-amber-300'
                  : isRoot
                  ? 'font-semibold text-slate-200'
                  : node.tier === 3
                  ? 'text-slate-300'
                  : 'text-slate-400'
              }`}
            >
              {node.name}
            </span>
            {node.tier > 0 && (
              <span className="font-mono text-[10px] text-slate-500">
                {node.tier === 1
                  ? '1ª'
                  : node.tier === 2
                  ? '2ª'
                  : '3ª'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {counts.subtreeCount > counts.directCount && (
              <span
                title="Total en toda esta rama"
                className="font-mono text-[10px] tabular-nums text-slate-500"
              >
                rama {counts.subtreeCount}
              </span>
            )}
            <span
              className={`font-mono text-xs tabular-nums min-w-[1.25rem] text-right ${
                hasDirect
                  ? 'font-bold text-amber-400'
                  : 'text-slate-600'
              }`}
            >
              {counts.directCount}
            </span>
          </div>
        </div>

        {hasDirect && (
          <div className="mt-1 mb-1.5 ml-2 flex flex-wrap gap-x-3 gap-y-1">
            {entries.map((entry, idx) => (
              <button
                key={`${entry.character.id}-${entry.role}-${entry.subIndex ?? idx}`}
                type="button"
                onClick={() => onSelectCharacter(entry.character.id)}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 hover:text-amber-300 transition-colors"
              >
                <User className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-medium">
                  {entry.character.character.name}
                </span>
                <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                  {entry.role === 'subclass'
                    ? `(Sub ${entry.subIndex} · Nv ${entry.level ?? '?'})`
                    : `(Nv ${entry.level ?? '?'} · ${entry.character.account})`}
                </span>
              </button>
            ))}
          </div>
        )}

        {node.children && node.children.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1, qLower))}
          </div>
        )}
      </div>
    );
  };

  const qLower = query.trim().toLowerCase();

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <section
        aria-label="Resumen de profesiones"
        className="grid grid-cols-2 lg:grid-cols-4 bg-[#111827] border border-[#1E293B] rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]"
      >
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">
            {includeSubclasses ? 'Clases contadas (Main + Sub)' : 'Personajes analizados'}
          </div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {includeSubclasses
              ? summaryStats.totalEntries
              : summaryStats.totalCharacters}
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Familias activas</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-400">
            {summaryStats.activeFamilies} / {PROFESSION_FAMILIES.length}
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Profesiones distintas</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {summaryStats.coveredProfessions}
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Sin clase / Pendientes</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-300">
            {summaryStats.unmatchedCount}
          </div>
        </div>
      </section>

      {/* Family Quick Summary Matrix */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-amber-400" />
            <h1 className="font-display text-sm font-semibold text-slate-100">
              Resumen por familia (11 ramas)
            </h1>
          </div>

          <button
            type="button"
            onClick={handleExportProfessionsCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PROFESSION_FAMILIES.map((fam) => {
            const count = (occupancy.byFamily.get(fam.id) || []).length;
            const isSelected = selectedFamilyId === fam.id;
            return (
              <button
                key={fam.id}
                type="button"
                onClick={() =>
                  setSelectedFamilyId((curr) =>
                    curr === fam.id ? 'all' : fam.id
                  )
                }
                className={`px-3 py-2 rounded-md border text-left transition-colors flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                    : count > 0
                    ? 'bg-[#0B0F17] border-[#283548] hover:border-amber-500/40 text-slate-200'
                    : 'bg-[#0B0F17] border-[#1E293B] hover:border-slate-700 text-slate-500'
                }`}
              >
                <span className="text-xs font-medium truncate">{fam.name}</span>
                <span
                  className={`font-mono text-xs tabular-nums shrink-0 ${
                    count > 0 ? 'font-bold text-amber-400' : 'text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Toolbar */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar profesión (ej. Hierophant, Maestro, Titan) o personaje..."
            className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-9 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
            <button
              type="button"
              onClick={() => setIncludeSubclasses(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                !includeSubclasses
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo clase Main
            </button>
            <button
              type="button"
              onClick={() => setIncludeSubclasses(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                includeSubclasses
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Main + Subclases
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
            <button
              type="button"
              onClick={() => setOnlyOwned(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                !onlyOwned
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Árbol completo
            </button>
            <button
              type="button"
              onClick={() => setOnlyOwned(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                onlyOwned
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solo activas (&gt;0)
            </button>
          </div>

          {selectedFamilyId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedFamilyId('all')}
              className="px-2.5 py-1.5 rounded-md border border-[#1E293B] bg-[#0B0F17] text-xs text-amber-300 hover:border-amber-500/50 whitespace-nowrap shrink-0"
            >
              Ver las 11 familias
            </button>
          )}
        </div>
      </section>

      {/* Family Trees Grid (2 columns on desktop matching the L2 tree diagram) */}
      {visibleFamilies.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-10 text-center text-xs text-slate-400">
          No hay familias o profesiones que coincidan con el filtro actual.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {visibleFamilies.map((fam) => {
            const famCount = (occupancy.byFamily.get(fam.id) || []).length;
            return (
              <section
                key={fam.id}
                className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[#1E293B] bg-[#161F30]/60 flex items-center justify-between gap-3">
                  <h2 className="font-display text-sm font-semibold text-slate-100">
                    {fam.name}
                  </h2>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      famCount > 0
                        ? 'font-bold text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {famCount}{' '}
                    {famCount === 1
                      ? includeSubclasses
                        ? 'registro'
                        : 'personaje'
                      : includeSubclasses
                      ? 'registros'
                      : 'personajes'}
                  </span>
                </div>

                <div className="p-3.5">{renderTreeNode(fam.root, 0, qLower)}</div>
              </section>
            );
          })}
        </div>
      )}

      {/* Unmatched / Pending Characters */}
      {occupancy.unmatched.length > 0 && (
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E293B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Personajes sin profesión asignada o no reconocida ({occupancy.unmatched.length})
            </h2>
          </div>

          <div className="divide-y divide-[#1E293B]">
            {occupancy.unmatched.map(({character, reason}) => (
              <div
                key={character.id}
                className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <button
                    type="button"
                    onClick={() => onSelectCharacter(character.id)}
                    className="font-medium text-amber-300 hover:underline"
                  >
                    {character.character.name}
                  </button>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{character.account}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{character.server}</span>
                </div>
                <span className="text-slate-400">{reason}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
