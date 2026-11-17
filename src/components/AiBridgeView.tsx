import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  FileJson,
  Pencil,
  Trash2,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {AI_BRIDGE_PROMPT, SAMPLE_CHARACTER_JSON} from '../data/promptTemplate';
import {
  ImportMergeMode,
  L2Database,
  ParsedPayloadPreview,
} from '../types/l2';
import {
  makeCharacterId,
  makeClanId,
  parseImportInput,
} from '../utils/jsonParser';
import {LOCATION_LABELS, formatInt} from '../utils/storage';

interface AiBridgeViewProps {
  db: L2Database;
  onApplyImport: (
    previews: ParsedPayloadPreview[],
    mergeMode: ImportMergeMode
  ) => void;
  onOpenCharacter: (id: string) => void;
  onOpenClan: (id: string) => void;
}

interface PreviewOverride {
  targetLabel?: string;
  account?: string;
  server?: string;
  clanName?: string;
  charClass?: string;
  level?: string;
}

export function AiBridgeView({
  db,
  onApplyImport,
  onOpenCharacter,
  onOpenClan,
}: AiBridgeViewProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [mergeMode, setMergeMode] = useState<ImportMergeMode>('replace_all');
  const [previewOverrides, setPreviewOverrides] = useState<
    Record<number, PreviewOverride>
  >({});
  const [editingPreviewIdx, setEditingPreviewIdx] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<
    {label: string; type: 'character' | 'clan'; id: string}[] | null
  >(null);

  const parsedResult = useMemo(() => {
    if (!jsonInput.trim()) return null;
    return parseImportInput(jsonInput, db);
  }, [jsonInput, db]);

  const effectivePreviews = useMemo(() => {
    if (!parsedResult) return [];
    return parsedResult.previews.map((preview) => {
      const ov = previewOverrides[preview.index];
      if (!ov) return preview;

      const nextServer = (ov.server ?? preview.server).trim() || preview.server;
      const isClan = preview.payload.capture_type === 'clan_warehouse';

      if (isClan) {
        const nextClan =
          (ov.clanName ?? preview.clanName ?? preview.targetLabel).trim() ||
          preview.targetLabel;
        const nextTargetId = makeClanId(nextServer, nextClan);
        const existingClan = db.clans.find((cl) => cl.id === nextTargetId);
        const existingAdena = existingClan
          ? existingClan.items.reduce(
              (acc, it) =>
                it.name.trim().toLowerCase() === 'adena' &&
                typeof it.quantity === 'number'
                  ? acc + it.quantity
                  : acc,
              0
            )
          : 0;

        return {
          ...preview,
          server: nextServer,
          clanName: nextClan,
          targetId: nextTargetId,
          targetLabel: nextClan,
          actionType: (existingClan ? 'update_clan' : 'create_clan') as ParsedPayloadPreview['actionType'],
          existingItemCount: existingClan ? existingClan.items.length : 0,
          existingAdena,
          payload: {
            ...preview.payload,
            server: nextServer,
            clan: nextClan,
          },
        };
      }

      const nextName =
        (ov.targetLabel ?? preview.targetLabel).trim() || preview.targetLabel;
      const nextAccount =
        (ov.account ?? preview.account ?? '').trim() || preview.account || '';
      const nextClan =
        ov.clanName !== undefined
          ? ov.clanName.trim() || null
          : preview.clanName;
      const nextClass =
        ov.charClass !== undefined
          ? ov.charClass.trim() || null
          : preview.payload.character?.class ?? null;
      const parsedLvl =
        ov.level !== undefined
          ? ov.level.trim() === ''
            ? null
            : Number(ov.level.trim())
          : preview.payload.character?.level ?? null;

      const nextTargetId = makeCharacterId(nextServer, nextAccount, nextName);
      const existingChar = db.characters.find((c) => c.id === nextTargetId);
      const existingAdena = existingChar
        ? existingChar.items.reduce(
            (acc, it) =>
              it.name.trim().toLowerCase() === 'adena' &&
              typeof it.quantity === 'number'
                ? acc + it.quantity
                : acc,
            0
          )
        : 0;

      const actionType: ParsedPayloadPreview['actionType'] = existingChar
        ? existingChar.status === 'pending'
          ? 'complete_pending_character'
          : 'update_character'
        : 'create_character';

      return {
        ...preview,
        server: nextServer,
        account: nextAccount,
        clanName: nextClan,
        targetId: nextTargetId,
        targetLabel: nextName,
        actionType,
        existingItemCount: existingChar ? existingChar.items.length : 0,
        existingAdena,
        payload: {
          ...preview.payload,
          server: nextServer,
          account: nextAccount,
          clan: nextClan,
          character: {
            ...(preview.payload.character || {}),
            name: nextName,
            class: nextClass,
            level: Number.isFinite(parsedLvl) ? parsedLvl : null,
          },
        },
      };
    });
  }, [parsedResult, previewOverrides, db.characters, db.clans]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_BRIDGE_PROMPT);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // Fallback via hidden textarea if clipboard API is restricted
      const el = document.createElement('textarea');
      el.value = AI_BRIDGE_PROMPT;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleSaveImport = () => {
    if (!parsedResult || !parsedResult.ok || effectivePreviews.length === 0) {
      return;
    }

    onApplyImport(effectivePreviews, mergeMode);
    setLastSaved(
      effectivePreviews.map((p) => ({
        label: p.targetLabel,
        type: p.payload.capture_type === 'clan_warehouse' ? 'clan' : 'character',
        id: p.targetId,
      }))
    );
    setJsonInput('');
    setPreviewOverrides({});
    setEditingPreviewIdx(null);
  };

  const actionLabelMap: Record<ParsedPayloadPreview['actionType'], string> = {
    create_character: 'Nuevo personaje',
    complete_pending_character: 'Completar pendiente',
    update_character: 'Actualizar personaje',
    create_clan: 'Nuevo almacén de clan',
    update_clan: 'Actualizar almacén de clan',
  };

  return (
    <div className="space-y-5">
      {lastSaved && lastSaved.length > 0 && (
        <div className="bg-emerald-950/35 border border-emerald-800/60 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              Importación guardada correctamente ({lastSaved.length}{' '}
              {lastSaved.length === 1 ? 'registro' : 'registros'}).
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastSaved.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.type === 'clan'
                    ? onOpenClan(item.id)
                    : onOpenCharacter(item.id)
                }
                className="inline-flex items-center gap-1 font-medium text-amber-300 hover:underline"
              >
                <span>Ver {item.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Step 1: Copyable Prompt */}
        <section className="xl:col-span-5 bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#1E293B] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                1. Prompt para tu IA externa
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Copia este prompt y adjunta tus capturas del panel de Lineage2.ES.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors whitespace-nowrap shrink-0"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar prompt</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 space-y-3">
            <pre className="bg-[#0B0F17] border border-[#1E293B] rounded-md p-3 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap max-h-[420px] overflow-y-auto">
              {AI_BRIDGE_PROMPT}
            </pre>

            <div className="text-xs text-slate-400 space-y-1">
              <p>
                Consejo: si un almacén es muy largo y requiere 2 o 3 capturas, súbelas juntas en el mismo mensaje para que la IA las combine sin duplicar filas solapadas.
              </p>
            </div>
          </div>
        </section>

        {/* Step 2: Paste JSON + Diff Preview */}
        <section className="xl:col-span-7 bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                2. Pegar JSON recibido
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Admite un JSON individual, un array o varios bloques pegados seguidos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setJsonInput(SAMPLE_CHARACTER_JSON);
                  setPreviewOverrides({});
                  setEditingPreviewIdx(null);
                  setLastSaved(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-slate-200 text-xs transition-colors whitespace-nowrap shrink-0"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Cargar ejemplo</span>
              </button>

              {jsonInput && (
                <button
                  type="button"
                  onClick={() => {
                    setJsonInput('');
                    setPreviewOverrides({});
                    setEditingPreviewIdx(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setPreviewOverrides({});
                setEditingPreviewIdx(null);
                setLastSaved(null);
              }}
              placeholder='Pega aquí el JSON devuelto por la IA (por ejemplo { "server": "Valakas [x10]", ... })'
              rows={11}
              spellCheck={false}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md p-3 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-y"
            />

            {/* Merge mode selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-300">
                  Si el personaje ya existe:
                </div>
                <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md w-fit">
                  <button
                    type="button"
                    onClick={() => setMergeMode('replace_all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      mergeMode === 'replace_all'
                        ? 'bg-[#1E293B] text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Reemplazar captura completa
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode('merge_locations')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      mergeMode === 'merge_locations'
                        ? 'bg-[#1E293B] text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Solo actualizar secciones del JSON
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={!parsedResult || !parsedResult.ok}
                onClick={handleSaveImport}
                className="px-4 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-[#1E293B] disabled:text-slate-500 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
              >
                Guardar en base local
              </button>
            </div>

            {/* Validation Errors */}
            {parsedResult && parsedResult.errors.length > 0 && (
              <div className="bg-red-950/35 border border-red-800/60 rounded-md p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No se pudo validar el JSON</span>
                </div>
                <ul className="list-disc list-inside text-xs text-red-200/90 space-y-1">
                  {parsedResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Diff */}
            {effectivePreviews.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="text-xs font-semibold text-slate-300">
                  Previsualización de cambios ({effectivePreviews.length})
                </div>

                <div className="divide-y divide-[#1E293B] border border-[#1E293B] rounded-md bg-[#0B0F17]">
                  {effectivePreviews.map((preview) => {
                    const isEditing = editingPreviewIdx === preview.index;
                    const isClan =
                      preview.payload.capture_type === 'clan_warehouse';
                    const ov = previewOverrides[preview.index] || {};

                    return (
                      <div key={preview.index} className="p-3.5 space-y-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display font-semibold text-sm text-slate-100">
                              {preview.targetLabel}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{preview.server}</span>
                            {preview.account && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-400">
                                  Cuenta: {preview.account}
                                </span>
                              </>
                            )}
                            {preview.clanName && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="text-amber-300">
                                  Clan: {preview.clanName}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPreviewIdx(
                                  isEditing ? null : preview.index
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-amber-300"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>
                                {isEditing ? 'Cerrar edición' : 'Corregir datos'}
                              </span>
                            </button>

                            <span className="font-mono text-[11px] text-emerald-400 font-medium">
                              {actionLabelMap[preview.actionType]}
                            </span>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="bg-[#111827] border border-amber-500/40 rounded-md p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {!isClan ? (
                              <>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Nombre del personaje
                                  </label>
                                  <input
                                    type="text"
                                    value={ov.targetLabel ?? preview.targetLabel}
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          targetLabel: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Cuenta
                                  </label>
                                  <input
                                    type="text"
                                    value={ov.account ?? preview.account ?? ''}
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          account: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Servidor
                                  </label>
                                  <input
                                    type="text"
                                    value={ov.server ?? preview.server}
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          server: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Clan
                                  </label>
                                  <input
                                    type="text"
                                    value={ov.clanName ?? preview.clanName ?? ''}
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          clanName: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="Sin clan"
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Clase
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      ov.charClass ??
                                      preview.payload.character?.class ??
                                      ''
                                    }
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          charClass: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Nivel
                                  </label>
                                  <input
                                    type="number"
                                    value={
                                      ov.level ??
                                      (preview.payload.character?.level ?? '')
                                    }
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          level: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Nombre del clan
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      ov.clanName ??
                                      preview.clanName ??
                                      preview.targetLabel
                                    }
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          clanName: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Servidor
                                  </label>
                                  <input
                                    type="text"
                                    value={ov.server ?? preview.server}
                                    onChange={(e) =>
                                      setPreviewOverrides((prev) => ({
                                        ...prev,
                                        [preview.index]: {
                                          ...prev[preview.index],
                                          server: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 font-mono text-[11px] tabular-nums">
                          <span>
                            Filas de ítems: {preview.existingItemCount} →{' '}
                            <strong className="text-slate-200">
                              {preview.incomingItemCount}
                            </strong>
                          </span>
                          <span>
                            Adena: {formatInt(preview.existingAdena)} →{' '}
                            <strong className="text-amber-300">
                              {formatInt(preview.incomingAdena)}
                            </strong>
                          </span>
                          <span>
                            Secciones:{' '}
                            {preview.locationsPresent
                              .map((loc) => LOCATION_LABELS[loc])
                              .join(', ') || 'Ninguna'}
                          </span>
                        </div>

                        {preview.uncertainCount > 0 && (
                          <div className="flex items-center gap-1.5 text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {preview.uncertainCount} fila(s) marcadas con uncertain: true para revisar luego.
                            </span>
                          </div>
                        )}

                        {preview.otherCharactersDetected.length > 0 && (
                          <div className="text-slate-400">
                            Otros personajes detectados en la cuenta:{' '}
                            <span className="text-slate-200">
                              {preview.otherCharactersDetected.join(', ')}
                            </span>
                          </div>
                        )}

                        {preview.warnings.map((w, idx) => (
                          <div key={idx} className="text-amber-300">
                            {w}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
