import {Download, RotateCcw, Trash2, Upload, X} from 'lucide-react';
import {useRef, useState} from 'react';
import {L2Database} from '../types/l2';
import {exportDatabaseAsFile, formatDateShort} from '../utils/storage';

interface BackupModalProps {
  open: boolean;
  db: L2Database;
  onClose: () => void;
  onRestoreBackup: (incoming: L2Database, mode: 'replace' | 'merge') => void;
  onResetToEmpty: () => void;
  onLoadStarterDemo: () => void;
}

export function BackupModal({
  open,
  db,
  onClose,
  onRestoreBackup,
  onResetToEmpty,
  onLoadStarterDemo,
}: BackupModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as L2Database;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.characters) ||
        !Array.isArray(parsed.clans)
      ) {
        setFeedback({
          type: 'error',
          text: 'El archivo no tiene el formato de respaldo válido de L2ES Vault.',
        });
        return;
      }

      onRestoreBackup(parsed, importMode);
      setFeedback({
        type: 'success',
        text:
          importMode === 'merge'
            ? `Respaldo fusionado por fecha y hora más reciente (${parsed.characters.length} personajes, ${parsed.clans.length} clanes analizados sin duplicar ítems).`
            : `Base de datos reemplazada (${parsed.characters.length} personajes, ${parsed.clans.length} clanes).`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'No se pudo leer el archivo JSON. Verifica que no esté corrupto.',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
        className="w-full max-w-lg bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <h2 id="backup-modal-title" className="font-display text-base font-semibold text-slate-100">
            Respaldo y datos locales
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm">
          {/* Current status summary */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 border-b border-[#1E293B] pb-4">
            <span>
              Personajes:{' '}
              <strong className="font-mono tabular-nums text-slate-200">
                {db.characters.length}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Clanes:{' '}
              <strong className="font-mono tabular-nums text-slate-200">
                {db.clans.length}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Ítems catalogados:{' '}
              <strong className="font-mono tabular-nums text-slate-200">
                {Object.keys(db.itemCatalog || {}).length}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Último cambio:{' '}
              <strong className="font-mono tabular-nums text-slate-200">
                {formatDateShort(db.updatedAt)}
              </strong>
            </span>
          </div>

          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-md border text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/60 text-red-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Export */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300">
              Exportar copia de seguridad
            </h3>
            <p className="text-xs text-slate-400">
              Descarga toda tu base de datos local en un archivo JSON para guardarla o moverla a otro navegador.
            </p>
            <button
              type="button"
              onClick={() => {
                exportDatabaseAsFile(db);
                setFeedback({
                  type: 'success',
                  text: 'Archivo de respaldo descargado correctamente.',
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar respaldo (.json)</span>
            </button>
          </div>

          {/* Import */}
          <div className="space-y-2.5 pt-4 border-t border-[#1E293B]">
            <h3 className="text-xs font-semibold text-slate-300">
              Importar respaldo guardado
            </h3>

            <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md w-fit">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  importMode === 'merge'
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fusionar (más reciente)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  importMode === 'replace'
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reemplazar todo
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {importMode === 'merge'
                ? 'Al fusionar se compara la fecha y hora de actualización de cada personaje, clan, cuenta e icono: siempre gana la versión más reciente sin duplicar ítems ni sumar cantidades.'
                : 'Reemplaza por completo la base de datos local con el contenido del archivo seleccionado.'}
            </p>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
                id="backup-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-slate-200 font-medium text-xs transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Seleccionar archivo .json</span>
              </button>
            </div>
          </div>

          {/* Reset & Starter Sample */}
          <div className="pt-4 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onLoadStarterDemo();
                setConfirmClear(false);
                setFeedback({
                  type: 'success',
                  text: 'Datos iniciales de ejemplo (Ignata + Mildret) restaurados.',
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-slate-300 hover:bg-[#161F30] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cargar ejemplo (Ignata + Mildret)</span>
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-red-400 hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar base local</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300">¿Borrar todo?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetToEmpty();
                    setConfirmClear(false);
                    setFeedback({
                      type: 'success',
                      text: 'Base de datos local vaciada.',
                    });
                  }}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
