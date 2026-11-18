import {
  Check,
  Copy,
  Database,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  Lock,
  Mail,
  Shield,
  Unlock,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';
import {ItemEntry, L2Database} from '../types/l2';
import {
  CsvSeparator,
  downloadBlobFile,
  exportAccountsCsv,
  exportCatalogCsv,
  exportCharactersCsv,
  exportClansCsv,
  exportItemsCsv,
  exportItemsGroupedCsv,
  filterDatabaseForExport,
  parseAccountsFileContent,
  parseCatalogFileContent,
  parseItemsFileContent,
} from '../utils/exportData';
import {formatInt} from '../utils/storage';

interface DownloadsViewProps {
  db: L2Database;
  servers: string[];
  selectedServer: string;
  onOpenBackup: () => void;
  onBulkUpsertCatalog: (entries: {name: string; icon: string}[]) => void;
  onSetIconBaseUrl: (url: string) => void;
  onBulkUpsertAccounts: (
    entries: {
      server: string;
      account: string;
      email?: string | null;
      password?: string | null;
      ssn?: string | null;
      notes?: string | null;
      lastAccess?: string | null;
    }[]
  ) => void;
  onApplyPartialItemsImport: (
    characterBatches: {
      server: string;
      account: string;
      name: string;
      items: Omit<ItemEntry, 'id'>[];
    }[],
    clanBatches: {
      server: string;
      name: string;
      items: Omit<ItemEntry, 'id'>[];
    }[]
  ) => void;
  onRestoreBackup: (incoming: L2Database, mode: 'replace' | 'merge') => void;
}

export function DownloadsView({
  db,
  servers,
  selectedServer,
  onOpenBackup,
  onBulkUpsertCatalog,
  onSetIconBaseUrl,
  onBulkUpsertAccounts,
  onApplyPartialItemsImport,
  onRestoreBackup,
}: DownloadsViewProps) {
  const [scopeServer, setScopeServer] = useState<string>(selectedServer);
  const [scopeAccount, setScopeAccount] = useState<string>('all');
  const [separator, setSeparator] = useState<CsvSeparator>(';');
  const [includeSecrets, setIncludeSecrets] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    title: string;
    filename: string;
    content: string;
    mime: string;
    bom: boolean;
  } | null>(null);

  const fullJsonInputRef = useRef<HTMLInputElement>(null);
  const itemsInputRef = useRef<HTMLInputElement>(null);
  const clansInputRef = useRef<HTMLInputElement>(null);
  const accountsInputRef = useRef<HTMLInputElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);

  const availableAccounts = useMemo(() => {
    const map = new Map<string, {id: string; server: string; account: string}>();
    db.accounts.forEach((acc) => {
      if (scopeServer !== 'all' && acc.server !== scopeServer) return;
      map.set(acc.id, {id: acc.id, server: acc.server, account: acc.account});
    });
    db.characters.forEach((char) => {
      if (scopeServer !== 'all' && char.server !== scopeServer) return;
      const id = `${char.server}::${char.account}`;
      if (!map.has(id)) {
        map.set(id, {id, server: char.server, account: char.account});
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.account.localeCompare(b.account, undefined, {numeric: true})
    );
  }, [db.accounts, db.characters, scopeServer]);

  const effectiveAccount = useMemo(() => {
    if (scopeAccount === 'all') return 'all';
    return availableAccounts.some((a) => a.id === scopeAccount)
      ? scopeAccount
      : 'all';
  }, [scopeAccount, availableAccounts]);

  const filterOpts = useMemo(
    () => ({
      server: scopeServer,
      account: effectiveAccount,
      includeSecrets,
      separator,
    }),
    [scopeServer, effectiveAccount, includeSecrets, separator]
  );

  const scopedStats = useMemo(() => {
    const filtered = filterDatabaseForExport(db, filterOpts);
    const charItemsCount = filtered.characters.reduce(
      (sum, c) => sum + c.items.length,
      0
    );
    const clanItemsCount = filtered.clans.reduce(
      (sum, cl) => sum + cl.items.length,
      0
    );
    const accountIds = new Set<string>();
    filtered.accounts.forEach((a) => accountIds.add(a.id));
    filtered.characters.forEach((c) => accountIds.add(`${c.server}::${c.account}`));

    return {
      characters: filtered.characters.length,
      accounts: accountIds.size,
      clans: filtered.clans.length,
      totalItemRows: charItemsCount + clanItemsCount,
      catalogCount: Object.keys(db.itemCatalog || {}).length,
    };
  }, [db, filterOpts]);

  const scopeSlug = useMemo(() => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (effectiveAccount !== 'all') {
      const accName = effectiveAccount.split('::')[1] || 'cuenta';
      return `${accName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${dateStr}`;
    }
    if (scopeServer !== 'all') {
      return `${scopeServer.replace(/[^a-zA-Z0-9_-]/g, '_')}-${dateStr}`;
    }
    return `completo-${dateStr}`;
  }, [scopeServer, effectiveAccount]);

  const handleDownload = (
    filename: string,
    content: string,
    mimeType: string,
    withUtf8Bom: boolean,
    label: string
  ) => {
    downloadBlobFile(filename, content, mimeType, withUtf8Bom);
    setFeedback({
      type: 'success',
      text: `Descargado "${filename}" (${label}).`,
    });
  };

  const handleCopyText = async (token: string, content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(token);
    setFeedback({
      type: 'success',
      text: `Copiado al portapapeles: ${label}.`,
    });
    setTimeout(() => {
      setCopiedId((curr) => (curr === token ? null : curr));
    }, 1800);
  };

  const defaultUploadServer =
    scopeServer !== 'all' ? scopeServer : servers[0] || 'Valakas [x10]';

  const handleUploadFullJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          text: `El archivo "${file.name}" no tiene estructura de copia completa L2ES Vault. Si es un catálogo de iconos, súbelo en su tarjeta correspondiente.`,
        });
        return;
      }
      onRestoreBackup(parsed, 'merge');
      const catalogCount = Object.keys(parsed.itemCatalog || {}).length;
      setFeedback({
        type: 'success',
        text: `Fusionado "${file.name}" tomando la última fecha y hora de actualización sin duplicar ítems (${parsed.characters.length} personajes, ${parsed.clans.length} clanes y ${catalogCount} iconos evaluados).`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `No se pudo leer el archivo JSON "${file.name}".`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadCatalog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = parseCatalogFileContent(text);
      if (res.error || res.entries.length === 0) {
        setFeedback({
          type: 'error',
          text: res.error || `No se encontraron iconos válidos en "${file.name}".`,
        });
        return;
      }
      if (res.iconBaseUrl) {
        onSetIconBaseUrl(res.iconBaseUrl);
      }
      onBulkUpsertCatalog(res.entries);
      setFeedback({
        type: 'success',
        text: `Subidos y fusionados ${formatInt(res.entries.length)} ítems al catálogo de iconos desde "${file.name}" sin tocar tus personajes ni cuentas.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `Error al procesar el archivo de iconos "${file.name}".`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadAccounts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = parseAccountsFileContent(text, defaultUploadServer);
      if (res.error || res.entries.length === 0) {
        setFeedback({
          type: 'error',
          text: res.error || `No se encontraron cuentas válidas en "${file.name}".`,
        });
        return;
      }
      onBulkUpsertAccounts(res.entries);
      setFeedback({
        type: 'success',
        text: `Subidas y actualizadas ${formatInt(res.entries.length)} cuentas desde "${file.name}".`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `Error al procesar el archivo de cuentas "${file.name}".`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadItems = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = parseItemsFileContent(text, defaultUploadServer);
      if (
        res.error ||
        (res.characterBatches.length === 0 && res.clanBatches.length === 0)
      ) {
        setFeedback({
          type: 'error',
          text: res.error || `No se encontraron ítems válidos en "${file.name}".`,
        });
        return;
      }
      onApplyPartialItemsImport(res.characterBatches, res.clanBatches);
      const totalItems =
        res.characterBatches.reduce((sum, b) => sum + b.items.length, 0) +
        res.clanBatches.reduce((sum, b) => sum + b.items.length, 0);
      setFeedback({
        type: 'success',
        text: `Importados ${formatInt(totalItems)} ítems desde "${file.name}" (${res.characterBatches.length} personajes, ${res.clanBatches.length} clanes actualizados).`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `Error al procesar el archivo de ítems "${file.name}".`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const triggerJsonFull = (previewOnly = false) => {
    const filtered = filterDatabaseForExport(db, filterOpts);
    const json = JSON.stringify(filtered, null, 2);
    const filename = `l2es-vault-${scopeSlug}.json`;
    if (previewOnly) {
      setPreviewData({
        title: 'Base de datos JSON',
        filename,
        content: json,
        mime: 'application/json',
        bom: false,
      });
      return;
    }
    handleDownload(
      filename,
      json,
      'application/json',
      false,
      `${filtered.characters.length} personajes, ${filtered.clans.length} clanes`
    );
  };

  const triggerItemsDetailed = (previewOnly = false) => {
    const {csv, rowCount} = exportItemsCsv(db, filterOpts);
    const filename = `l2es-items-detallado-${scopeSlug}.csv`;
    if (previewOnly) {
      setPreviewData({
        title: 'Inventario detallado (CSV)',
        filename,
        content: csv,
        mime: 'text/csv;charset=utf-8',
        bom: true,
      });
      return;
    }
    handleDownload(
      filename,
      csv,
      'text/csv;charset=utf-8',
      true,
      `${formatInt(rowCount)} filas de objetos`
    );
  };

  const triggerItemsGrouped = (previewOnly = false) => {
    const {csv, rowCount} = exportItemsGroupedCsv(db, filterOpts);
    const filename = `l2es-items-resumen-${scopeSlug}.csv`;
    if (previewOnly) {
      setPreviewData({
        title: 'Resumen agrupado de ítems (CSV)',
        filename,
        content: csv,
        mime: 'text/csv;charset=utf-8',
        bom: true,
      });
      return;
    }
    handleDownload(
      filename,
      csv,
      'text/csv;charset=utf-8',
      true,
      `${formatInt(rowCount)} ítems distintos`
    );
  };

  const triggerCharacters = (previewOnly = false) => {
    const {csv, rowCount} = exportCharactersCsv(db, filterOpts);
    const filename = `l2es-personajes-${scopeSlug}.csv`;
    if (previewOnly) {
      setPreviewData({
        title: 'Listado de personajes (CSV)',
        filename,
        content: csv,
        mime: 'text/csv;charset=utf-8',
        bom: true,
      });
      return;
    }
    handleDownload(
      filename,
      csv,
      'text/csv;charset=utf-8',
      true,
      `${formatInt(rowCount)} personajes`
    );
  };

  const triggerAccounts = (previewOnly = false) => {
    const {csv, rowCount} = exportAccountsCsv(db, filterOpts);
    const filename = `l2es-cuentas-${scopeSlug}.csv`;
    if (previewOnly) {
      setPreviewData({
        title: 'Cuentas y correos (CSV)',
        filename,
        content: csv,
        mime: 'text/csv;charset=utf-8',
        bom: true,
      });
      return;
    }
    handleDownload(
      filename,
      csv,
      'text/csv;charset=utf-8',
      true,
      `${formatInt(rowCount)} cuentas`
    );
  };

  const triggerClans = (previewOnly = false) => {
    const {csv, rowCount} = exportClansCsv(db, filterOpts);
    const filename = `l2es-clanes-${scopeSlug}.csv`;
    if (previewOnly) {
      setPreviewData({
        title: 'Almacenes de clan (CSV)',
        filename,
        content: csv,
        mime: 'text/csv;charset=utf-8',
        bom: true,
      });
      return;
    }
    handleDownload(
      filename,
      csv,
      'text/csv;charset=utf-8',
      true,
      `${formatInt(rowCount)} filas de almacén de clan`
    );
  };

  const triggerCatalogCsv = (previewOnly = false) => {
    const {csv, rowCount} = exportCatalogCsv(db, separator);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `l2es-catalogo-iconos-${dateStr}.csv`;
    if (previewOnly) {
      setPreviewData({
        title: 'Catálogo de iconos (CSV)',
        filename,
        content: csv,
        mime: 'text/csv;charset=utf-8',
        bom: true,
      });
      return;
    }
    handleDownload(
      filename,
      csv,
      'text/csv;charset=utf-8',
      true,
      `${formatInt(rowCount)} ítems catalogados`
    );
  };

  const triggerCatalogJson = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const payload = {
      iconBaseUrl: db.iconBaseUrl,
      itemCatalog: db.itemCatalog,
    };
    handleDownload(
      `l2es-catalogo-iconos-${dateStr}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
      false,
      `${formatInt(scopedStats.catalogCount)} iconos`
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Scope Controls */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
              Descargar y subir datos
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Exporta toda tu información o sube archivos individuales (solo el catálogo de iconos de ítems, inventarios en CSV, cuentas o respaldo completo) sin sobrescribir el resto.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBackup}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Restaurar respaldo .json</span>
          </button>
        </div>

        {/* Filter & Format Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label
              htmlFor="dl-server-filter"
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Servidor
            </label>
            <select
              id="dl-server-filter"
              value={scopeServer}
              onChange={(e) => {
                setScopeServer(e.target.value);
                setScopeAccount('all');
              }}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos los servidores ({servers.length})</option>
              {servers.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dl-account-filter"
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Cuenta
            </label>
            <select
              id="dl-account-filter"
              value={effectiveAccount}
              onChange={(e) => setScopeAccount(e.target.value)}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">
                Todas las cuentas ({availableAccounts.length})
              </option>
              {availableAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account} ({acc.server})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dl-csv-sep"
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Separador Excel / CSV
            </label>
            <select
              id="dl-csv-sep"
              value={separator}
              onChange={(e) => setSeparator(e.target.value as CsvSeparator)}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value=";">Punto y coma (;) · Excel España</option>
              <option value=",">Coma (,) · CSV estándar</option>
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-400 mb-1">
              Seguridad (claves y SSN)
            </span>
            <button
              type="button"
              onClick={() => setIncludeSecrets((v) => !v)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
                includeSecrets
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-[#0B0F17] border-[#1E293B] text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {includeSecrets ? (
                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                )}
                <span className="truncate">
                  {includeSecrets ? 'Incluir claves y SSN' : 'Ocultar claves y SSN'}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Scoped Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border border-[#1E293B] rounded-md bg-[#0B0F17] divide-y sm:divide-y-0 sm:divide-x divide-[#1E293B]">
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Cuentas</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
              {scopedStats.accounts}
            </div>
          </div>
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Personajes</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
              {scopedStats.characters}
            </div>
          </div>
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Clanes</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
              {scopedStats.clans}
            </div>
          </div>
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Filas de ítems</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-amber-400">
              {formatInt(scopedStats.totalItemRows)}
            </div>
          </div>
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Iconos catalogados</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
              {formatInt(scopedStats.catalogCount)}
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-md px-3.5 py-2 text-xs flex items-center justify-between gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/35 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Cerrar aviso"
              className={
                feedback.type === 'success'
                  ? 'text-emerald-400 hover:text-emerald-200'
                  : 'text-red-400 hover:text-red-200'
              }
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Primary Full JSON Backup Banner */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Copia completa en JSON (reimportable en L2ES Vault)
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Guarda toda la estructura intacta (personajes, subclases, slots de equipo, almacenes de clan, cuentas y catálogo de iconos) para moverla a otro ordenador o volver a subirla.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fullJsonInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleUploadFullJson}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => triggerJsonFull(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista previa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const filtered = filterDatabaseForExport(db, filterOpts);
              handleCopyText(
                'json-full',
                JSON.stringify(filtered, null, 2),
                'JSON completo'
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            {copiedId === 'json-full' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fullJsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Subir .json</span>
          </button>

          <button
            type="button"
            onClick={() => triggerJsonFull(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar .json</span>
          </button>
        </div>
      </section>

      {/* Specific Dataset Exports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Detailed Items CSV */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Inventario completo (detallado)
                </h3>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {formatInt(scopedStats.totalItemRows)} filas
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Exporta fila por fila todos los objetos de equipo, inventario, almacén personal, correo, mascotas, misiones y almacenes de clan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={itemsInputRef}
              type="file"
              accept=".csv,.json,.txt,text/csv,application/json"
              onChange={handleUploadItems}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => triggerItemsDetailed(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => itemsInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir CSV / JSON</span>
            </button>
            <button
              type="button"
              onClick={() => triggerItemsDetailed(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa</span>
            </button>
          </div>
        </section>

        {/* 2. Grouped Items Summary CSV */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Resumen agrupado por objeto
                </h3>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Totales sumados
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Suma las cantidades totales de cada objeto (Adena, consumibles, materiales, etc.), indica en qué personajes está y añade la URL del icono.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => triggerItemsGrouped(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => triggerItemsGrouped(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa</span>
            </button>
          </div>
        </section>

        {/* 3. Characters CSV */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Ficha de personajes y subclases
                </h3>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {scopedStats.characters} personajes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Nivel, clase, raza, HP/MP/SP, horas jugadas, PvP/PK, noble, héroe, subclases 1–3, clan, Adena personal y último acceso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => triggerCharacters(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => triggerCharacters(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa</span>
            </button>
          </div>
        </section>

        {/* 4. Accounts & Emails CSV */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Cuentas, correos y credenciales
                </h3>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {scopedStats.accounts} cuentas
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Listado de cuentas agrupable por correo en Excel, con personajes vinculados y notas.{' '}
              {includeSecrets
                ? 'Las contraseñas y SSN se incluirán en texto plano.'
                : 'Las contraseñas y SSN saldrán ocultos.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={accountsInputRef}
              type="file"
              accept=".csv,.json,.txt,text/csv,application/json"
              onChange={handleUploadAccounts}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => triggerAccounts(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => accountsInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir CSV / JSON</span>
            </button>
            <button
              type="button"
              onClick={() => triggerAccounts(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa</span>
            </button>
          </div>
        </section>

        {/* 5. Clan Warehouses CSV */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Almacenes de clan
                </h3>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {scopedStats.clans} clanes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Objetos guardados en cada almacén compartido de clan junto con la lista de personajes vinculados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={clansInputRef}
              type="file"
              accept=".csv,.json,.txt,text/csv,application/json"
              onChange={handleUploadItems}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => triggerClans(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => clansInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir CSV</span>
            </button>
            <button
              type="button"
              onClick={() => triggerClans(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa</span>
            </button>
          </div>
        </section>

        {/* 6. Item Icon Catalog */}
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Base de datos de iconos de ítems
                </h3>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {formatInt(scopedStats.catalogCount)} ítems
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Descarga o sube únicamente tu catálogo de nombres e imágenes (en CSV o JSON) sin modificar personajes ni cuentas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={catalogInputRef}
              type="file"
              accept=".json,.csv,.txt,application/json,text/csv"
              onChange={handleUploadCatalog}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => triggerCatalogCsv(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={triggerCatalogJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => catalogInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-amber-500/40 text-xs text-amber-300 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir (.json / .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => triggerCatalogCsv(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa</span>
            </button>
          </div>
        </section>
      </div>

      {/* Inline File Preview */}
      {previewData && (
        <section className="bg-[#111827] border border-amber-500/40 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Vista previa: {previewData.title}
              </h3>
              <p className="font-mono text-[11px] text-slate-400">
                {previewData.filename}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    'preview',
                    previewData.content,
                    previewData.title
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200"
              >
                {copiedId === 'preview' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar todo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDownload(
                    previewData.filename,
                    previewData.content,
                    previewData.mime,
                    previewData.bom,
                    previewData.title
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar archivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewData(null)}
                aria-label="Cerrar vista previa"
                className="p-1.5 text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <pre className="p-4 bg-[#0B0F17] text-[11px] font-mono text-slate-300 overflow-x-auto max-h-80 leading-relaxed whitespace-pre">
            {previewData.content.split('\n').slice(0, 40).join('\n')}
            {previewData.content.split('\n').length > 40
              ? `\n... (${previewData.content.split('\n').length - 40} líneas más en el archivo descargado)`
              : ''}
          </pre>
        </section>
      )}
    </div>
  );
}
