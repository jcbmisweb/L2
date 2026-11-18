import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {AccountMeta, CharacterRecord, L2Database} from '../types/l2';
import {parseFlexibleTimestamp} from '../utils/mergeDatabase';

interface AccountsDirectoryViewProps {
  db: L2Database;
  servers: string[];
  selectedServer: string;
  initialEmailFilter?: string | null;
  onUpsertAccount: (input: {
    server: string;
    account: string;
    email?: string | null;
    password?: string | null;
    ssn?: string | null;
    notes?: string | null;
    creationDate?: string | null;
    lastAccess?: string | null;
    lastIp?: string | null;
    originalId?: string;
  }) => void;
  onBulkUpsertAccounts: (
    entries: {
      server: string;
      account: string;
      email?: string | null;
      password?: string | null;
      ssn?: string | null;
    }[]
  ) => void;
  onDeleteAccount: (accountId: string) => void;
  onSelectCharacter: (characterId: string) => void;
  onSelectAccount: (accountId: string) => void;
}

interface ParsedBulkAccount {
  server: string;
  account: string;
  password: string | null;
  email: string | null;
  ssn: string | null;
}

function cleanSsnValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^ssn\s*:\s*/i, '').trim();
  return cleaned || null;
}

function parseBulkAccountsInput(
  rawText: string,
  defaultServer: string
): {entries: ParsedBulkAccount[]; error: string | null} {
  const trimmed = rawText.trim();
  if (!trimmed) return {entries: [], error: null};

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const entries: ParsedBulkAccount[] = [];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const obj = item as Record<string, unknown>;
        const account = String(obj.account || obj.cuenta || '').trim();
        if (!account) continue;
        entries.push({
          server: String(obj.server || defaultServer || 'Valakas [x10]').trim(),
          account,
          password: obj.password || obj.contraseña ? String(obj.password || obj.contraseña).trim() : null,
          email: obj.email || obj.correo ? String(obj.email || obj.correo).trim() : null,
          ssn: cleanSsnValue(obj.ssn ? String(obj.ssn) : null),
        });
      }
      return {
        entries,
        error: entries.length === 0 ? 'No se encontraron cuentas válidas en el JSON.' : null,
      };
    } catch {
      return {entries: [], error: 'JSON inválido. Revisa el formato.'};
    }
  }

  const lines = trimmed.split(/\r?\n/);
  const entries: ParsedBulkAccount[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Detect delimiter: tab first (Excel/Google Sheets), then |, ;, comma
    const delimiter = line.includes('\t')
      ? '\t'
      : line.includes('|')
      ? '|'
      : line.includes(';')
      ? ';'
      : ',';

    let cols = line.split(delimiter).map((c) => c.trim());

    // Skip header row
    const joinedLower = cols.join(' ').toLowerCase();
    if (
      joinedLower.includes('cuenta') &&
      (joinedLower.includes('contraseña') || joinedLower.includes('password'))
    ) {
      continue;
    }

    // If first col is just row index number (e.g., "1", "2", "14"), drop it
    if (cols.length >= 2 && /^\d{1,4}$/.test(cols[0])) {
      cols = cols.slice(1);
    }

    const account = cols[0] || '';
    if (!account) continue;

    const password = cols[1] ? cols[1] : null;
    let email: string | null = null;
    let ssn: string | null = null;

    // Inspect remaining columns smartly so missing email doesn't misplace SSN
    for (let i = 2; i < cols.length; i++) {
      const val = cols[i];
      if (!val) continue;
      if (val.includes('@')) {
        email = val;
      } else if (/^ssn\s*:/i.test(val) || /^\d{8,}$/.test(val.replace(/\s+/g, ''))) {
        ssn = cleanSsnValue(val);
      } else if (!email && i === 2) {
        email = val;
      } else if (!ssn) {
        ssn = cleanSsnValue(val);
      }
    }

    entries.push({
      server: defaultServer || 'Valakas [x10]',
      account,
      password,
      email,
      ssn,
    });
  }

  return {
    entries,
    error:
      entries.length === 0
        ? 'No se detectaron filas válidas. Pega filas separadas por tabulador (Excel), punto y coma o coma.'
        : null,
  };
}

export function AccountsDirectoryView({
  db,
  servers,
  selectedServer,
  initialEmailFilter,
  onUpsertAccount,
  onBulkUpsertAccounts,
  onDeleteAccount,
  onSelectCharacter,
  onSelectAccount,
}: AccountsDirectoryViewProps) {
  const defaultServer =
    selectedServer !== 'all'
      ? selectedServer
      : servers[0] || 'Valakas [x10]';

  const [query, setQuery] = useState('');
  const [emailFilter, setEmailFilter] = useState(initialEmailFilter || 'all');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [groupedLayout, setGroupedLayout] = useState<'cards' | 'table'>('cards');
  const [showAllSecrets, setShowAllSecrets] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [collapsedEmails, setCollapsedEmails] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmailFilter) {
      setEmailFilter(initialEmailFilter);
      setViewMode('grouped');
    } else {
      setEmailFilter('all');
    }
  }, [initialEmailFilter]);

  // Add/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingOriginalId, setEditingOriginalId] = useState<string | undefined>(undefined);
  const [formServer, setFormServer] = useState(defaultServer);
  const [formAccount, setFormAccount] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSsn, setFormSsn] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCreationDate, setFormCreationDate] = useState('');
  const [formLastAccess, setFormLastAccess] = useState('');
  const [formLastIp, setFormLastIp] = useState('');

  // Bulk Excel/CSV paste state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkServer, setBulkServer] = useState(defaultServer);
  const [bulkText, setBulkText] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Consolidate accounts from db.accounts + any orphan characters
  const allAccounts = useMemo(() => {
    const map = new Map<
      string,
      AccountMeta & {characters: CharacterRecord[]}
    >();

    db.accounts.forEach((acc) => {
      if (selectedServer !== 'all' && acc.server !== selectedServer) return;
      map.set(acc.id, {
        ...acc,
        characters: [],
      });
    });

    db.characters.forEach((char) => {
      if (selectedServer !== 'all' && char.server !== selectedServer) return;
      const id = `${char.server}::${char.account}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          server: char.server,
          account: char.account,
          characters: [],
        });
      }
      map.get(id)!.characters.push(char);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.account.localeCompare(b.account, undefined, {numeric: true})
    );
  }, [db.accounts, db.characters, selectedServer]);

  const distinctEmails = useMemo(() => {
    const set = new Set<string>();
    allAccounts.forEach((a) => {
      if (a.email && a.email.trim()) set.add(a.email.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAccounts.filter((acc) => {
      const emailVal = acc.email?.trim() || '';
      if (emailFilter === '__none__' && emailVal !== '') return false;
      if (
        emailFilter !== 'all' &&
        emailFilter !== '__none__' &&
        emailVal.toLowerCase() !== emailFilter.toLowerCase()
      ) {
        return false;
      }

      if (q) {
        const charNames = acc.characters.map((c) => c.character.name).join(' ');
        const hay = `${acc.account} ${emailVal} ${acc.ssn || ''} ${
          acc.server
        } ${acc.notes || ''} ${charNames}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allAccounts, emailFilter, query]);

  const groupedByEmail = useMemo(() => {
    const map = new Map<
      string,
      {emailLabel: string; isEmpty: boolean; accounts: typeof filteredAccounts}
    >();

    filteredAccounts.forEach((acc) => {
      const cleanEmail = acc.email?.trim() || '';
      const key = cleanEmail ? cleanEmail.toLowerCase() : '__none__';
      if (!map.has(key)) {
        map.set(key, {
          emailLabel: cleanEmail || 'Sin correo asignado',
          isEmpty: !cleanEmail,
          accounts: [],
        });
      }
      map.get(key)!.accounts.push(acc);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isEmpty) return 1;
      if (b.isEmpty) return -1;
      return a.emailLabel.localeCompare(b.emailLabel);
    });
  }, [filteredAccounts]);

  const parsedBulk = useMemo(
    () => parseBulkAccountsInput(bulkText, bulkServer),
    [bulkText, bulkServer]
  );

  const stats = useMemo(() => {
    const withCreds = allAccounts.filter((a) => a.password || a.ssn).length;
    const withChars = allAccounts.filter((a) => a.characters.length > 0).length;
    return {
      total: allAccounts.length,
      emails: distinctEmails.length,
      withCreds,
      withChars,
    };
  }, [allAccounts, distinctEmails]);

  const copyValue = async (token: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken((curr) => (curr === token ? null : curr));
    }, 1500);
  };

  const openNewForm = () => {
    setEditingOriginalId(undefined);
    setFormServer(defaultServer);
    setFormAccount('');
    setFormPassword('');
    setFormEmail(
      emailFilter !== 'all' && emailFilter !== '__none__' ? emailFilter : ''
    );
    setFormSsn('');
    setFormNotes('');
    setFormCreationDate('');
    setFormLastAccess('');
    setFormLastIp('');
    setShowForm(true);
    setShowBulk(false);
  };

  const openEditForm = (acc: AccountMeta) => {
    setEditingOriginalId(acc.id);
    setFormServer(acc.server);
    setFormAccount(acc.account);
    setFormPassword(acc.password || '');
    setFormEmail(acc.email || '');
    setFormSsn(acc.ssn || '');
    setFormNotes(acc.notes || '');
    setFormCreationDate(acc.creationDate || '');
    setFormLastAccess(acc.lastAccess || '');
    setFormLastIp(acc.lastIp || '');
    setShowForm(true);
    setShowBulk(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccount.trim() || !formServer.trim()) return;
    onUpsertAccount({
      server: formServer,
      account: formAccount,
      password: formPassword,
      email: formEmail,
      ssn: cleanSsnValue(formSsn),
      notes: formNotes,
      creationDate: formCreationDate,
      lastAccess: formLastAccess,
      lastIp: formLastIp,
      originalId: editingOriginalId,
    });
    setShowForm(false);
    setEditingOriginalId(undefined);
  };

  const handleBulkSave = () => {
    if (parsedBulk.entries.length === 0) return;
    onBulkUpsertAccounts(parsedBulk.entries);
    setBulkFeedback(`Importadas ${parsedBulk.entries.length} cuentas correctamente.`);
    setBulkText('');
    setShowBulk(false);
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <section
        aria-label="Resumen de cuentas"
        className="grid grid-cols-2 lg:grid-cols-4 bg-[#111827] border border-[#1E293B] rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]"
      >
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Cuentas totales</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {stats.total}
          </div>
        </div>
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Correos distintos</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {stats.emails}
          </div>
        </div>
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Con clave / SSN</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-400">
            {stats.withCreds}
          </div>
        </div>
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-400">Con personajes</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">
            {stats.withChars}
          </div>
        </div>
      </section>

      {/* Toolbar & Actions */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cuenta, correo, SSN, notas o personaje..."
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAllSecrets((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              {showAllSecrets ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ocultar claves</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Mostrar claves</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowBulk((v) => !v);
                setShowForm(false);
                setBulkFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Pegar desde Excel</span>
            </button>

            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir cuenta</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filtrar por correo"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos los correos ({distinctEmails.length})</option>
              {distinctEmails.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
              <option value="__none__">Sin correo asignado</option>
            </select>

            <span className="font-mono text-xs tabular-nums text-slate-400">
              {filteredAccounts.length} cuentas mostradas
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'grouped' && (
              <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
                <button
                  type="button"
                  onClick={() => setGroupedLayout('cards')}
                  aria-label="Tarjetas por correo"
                  title="Tarjetas por correo"
                  className={`p-1.5 rounded transition-colors ${
                    groupedLayout === 'cards'
                      ? 'bg-[#1E293B] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setGroupedLayout('table')}
                  aria-label="Lista por correo"
                  title="Lista por correo"
                  className={`p-1.5 rounded transition-colors ${
                    groupedLayout === 'table'
                      ? 'bg-[#1E293B] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'grouped'
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Agrupado por correo
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'table'
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tabla general
              </button>
            </div>
          </div>
        </div>

        {bulkFeedback && (
          <div className="bg-emerald-950/35 border border-emerald-800/60 rounded-md px-3.5 py-2 text-xs text-emerald-300 flex items-center justify-between">
            <span>{bulkFeedback}</span>
            <button
              type="button"
              onClick={() => setBulkFeedback(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* Add / Edit Single Account Form */}
      {showForm && (
        <form
          onSubmit={handleSaveForm}
          className="bg-[#111827] border border-amber-500/40 rounded-lg p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              {editingOriginalId ? 'Editar datos de cuenta' : 'Nueva cuenta'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Cuenta *</label>
              <input
                type="text"
                required
                value={formAccount}
                onChange={(e) => setFormAccount(e.target.value)}
                placeholder="Ej. remate18"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Contraseña</label>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Contraseña de la cuenta"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Correo electrónico</label>
              <input
                type="text"
                list="existing-emails-list"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ej. usuario@gmail.com"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <datalist id="existing-emails-list">
                {distinctEmails.map((em) => (
                  <option key={em} value={em} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">SSN</label>
              <input
                type="text"
                value={formSsn}
                onChange={(e) => setFormSsn(e.target.value)}
                placeholder="Ej. 3486523178993"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Servidor *</label>
              <input
                type="text"
                required
                list="existing-servers-list"
                value={formServer}
                onChange={(e) => setFormServer(e.target.value)}
                placeholder="Valakas [x10]"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <datalist id="existing-servers-list">
                {servers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Notas</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Opcional (ej. cuenta enanos)"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Fecha creación</label>
              <input
                type="text"
                value={formCreationDate}
                onChange={(e) => setFormCreationDate(e.target.value)}
                placeholder="Ej. 19/09/2009 16:03"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Último acceso</label>
              <input
                type="text"
                value={formLastAccess}
                onChange={(e) => setFormLastAccess(e.target.value)}
                placeholder="Ej. 11/11/2026 14:04"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Última IP</label>
              <input
                type="text"
                value={formLastIp}
                onChange={(e) => setFormLastIp(e.target.value)}
                placeholder="Ej. 88.20.221.56"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3.5 py-2 rounded-md text-slate-300 hover:bg-[#161F30]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              Guardar cuenta
            </button>
          </div>
        </form>
      )}

      {/* Bulk Paste from Excel / Sheets / JSON */}
      {showBulk && (
        <section className="bg-[#111827] border border-amber-500/40 rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Pegar listado desde Excel / Google Sheets o JSON
              </h2>
              <p className="text-slate-400 mt-0.5">
                Selecciona tus filas en la hoja de cálculo (con o sin número de fila y prefijo "SSN:") y pégalas aquí directamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBulk(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="bulk-acc-server" className="text-slate-400">
              Servidor para estas cuentas:
            </label>
            <input
              id="bulk-acc-server"
              type="text"
              value={bulkServer}
              onChange={(e) => setBulkServer(e.target.value)}
              className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-slate-100 w-48 focus:outline-none focus:border-amber-500"
            />
          </div>

          <textarea
            rows={7}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Ejemplo copiando directo de Excel:\n1\tjuancodina\tMiClave\tcorreo@ejemplo.com\tSSN: 2871459877918\n2\tremate18\tMiClave2\totro@gmail.com\tSSN: 3486523178993`}
            className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md p-3 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />

          {parsedBulk.error && (
            <div className="text-red-300 bg-red-950/35 border border-red-800/60 rounded px-3 py-2">
              {parsedBulk.error}
            </div>
          )}

          {parsedBulk.entries.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-emerald-300 font-mono tabular-nums">
                Detectadas {parsedBulk.entries.length} cuentas listas para guardar
              </span>
              <button
                type="button"
                onClick={handleBulkSave}
                className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Importar {parsedBulk.entries.length} cuentas
              </button>
            </div>
          )}
        </section>
      )}

      {/* Accounts Listing */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-10 text-center text-xs text-slate-400 space-y-2">
          <p>No hay cuentas que coincidan con los filtros.</p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-4">
          {groupedByEmail.map((group) => {
            const isCollapsed = Boolean(collapsedEmails[group.emailLabel]);
            return (
              <section
                key={group.emailLabel}
                className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
              >
                <div
                  onClick={() =>
                    setCollapsedEmails((prev) => ({
                      ...prev,
                      [group.emailLabel]: !prev[group.emailLabel],
                    }))
                  }
                  className="cursor-pointer px-4 py-3 bg-[#161F30]/60 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 hover:bg-[#161F30] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-slate-400 shrink-0">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <span
                      className={`font-display text-sm font-semibold truncate ${
                        group.isEmpty ? 'text-slate-400' : 'text-slate-100'
                      }`}
                    >
                      {group.emailLabel}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-slate-400">
                      · {group.accounts.length}{' '}
                      {group.accounts.length === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </div>

                  {!group.isEmpty && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyValue(`mail-${group.emailLabel}`, group.emailLabel);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0F17] border border-[#1E293B] text-[11px] text-slate-300 hover:text-amber-300"
                    >
                      {copiedToken === `mail-${group.emailLabel}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar correo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {!isCollapsed &&
                  (groupedLayout === 'cards' ? (
                    <AccountCardGrid
                      accounts={group.accounts}
                      showAllSecrets={showAllSecrets}
                      revealedIds={revealedIds}
                      onToggleReveal={(id) =>
                        setRevealedIds((prev) => ({...prev, [id]: !prev[id]}))
                      }
                      copiedToken={copiedToken}
                      onCopy={copyValue}
                      onEdit={openEditForm}
                      confirmDeleteId={confirmDeleteId}
                      onRequestDelete={setConfirmDeleteId}
                      onConfirmDelete={(id) => {
                        onDeleteAccount(id);
                        setConfirmDeleteId(null);
                      }}
                      onSelectCharacter={onSelectCharacter}
                      onSelectAccount={onSelectAccount}
                    />
                  ) : (
                    <AccountTable
                      accounts={group.accounts}
                      showEmailColumn={false}
                      showAllSecrets={showAllSecrets}
                      revealedIds={revealedIds}
                      onToggleReveal={(id) =>
                        setRevealedIds((prev) => ({...prev, [id]: !prev[id]}))
                      }
                      copiedToken={copiedToken}
                      onCopy={copyValue}
                      onEdit={openEditForm}
                      confirmDeleteId={confirmDeleteId}
                      onRequestDelete={setConfirmDeleteId}
                      onConfirmDelete={(id) => {
                        onDeleteAccount(id);
                        setConfirmDeleteId(null);
                      }}
                      onSelectCharacter={onSelectCharacter}
                      onSelectAccount={onSelectAccount}
                    />
                  ))}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
          <AccountTable
            accounts={filteredAccounts}
            showEmailColumn={true}
            showAllSecrets={showAllSecrets}
            revealedIds={revealedIds}
            onToggleReveal={(id) =>
              setRevealedIds((prev) => ({...prev, [id]: !prev[id]}))
            }
            copiedToken={copiedToken}
            onCopy={copyValue}
            onEdit={openEditForm}
            confirmDeleteId={confirmDeleteId}
            onRequestDelete={setConfirmDeleteId}
            onConfirmDelete={(id) => {
              onDeleteAccount(id);
              setConfirmDeleteId(null);
            }}
            onSelectCharacter={onSelectCharacter}
            onSelectAccount={onSelectAccount}
          />
        </section>
      )}
    </div>
  );
}

interface AccountTableProps {
  accounts: (AccountMeta & {characters: CharacterRecord[]})[];
  showEmailColumn: boolean;
  showAllSecrets: boolean;
  revealedIds: Record<string, boolean>;
  onToggleReveal: (id: string) => void;
  copiedToken: string | null;
  onCopy: (token: string, val: string | null | undefined) => void;
  onEdit: (acc: AccountMeta) => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
  onSelectCharacter: (characterId: string) => void;
  onSelectAccount: (accountId: string) => void;
}

function AccountTable({
  accounts,
  showEmailColumn,
  showAllSecrets,
  revealedIds,
  onToggleReveal,
  copiedToken,
  onCopy,
  onEdit,
  confirmDeleteId,
  onRequestDelete,
  onConfirmDelete,
  onSelectCharacter,
  onSelectAccount,
}: AccountTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#1E293B] bg-[#161F30]/40 text-[11px] font-medium text-slate-400">
            <th className="py-2.5 pl-4 pr-3">Cuenta</th>
            <th className="py-2.5 px-3">Contraseña</th>
            {showEmailColumn && <th className="py-2.5 px-3">Correo</th>}
            <th className="py-2.5 px-3">SSN</th>
            <th className="py-2.5 px-3">Personajes</th>
            <th className="py-2.5 pl-3 pr-4 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E293B] text-xs">
          {accounts.map((acc) => {
            const isRevealed = showAllSecrets || Boolean(revealedIds[acc.id]);
            const isConfirmingDelete = confirmDeleteId === acc.id;

            return (
              <tr
                key={acc.id}
                className="hover:bg-[#161F30]/50 transition-colors"
              >
                <td className="py-2.5 pl-4 pr-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectAccount(acc.id)}
                      className="font-medium text-amber-300 hover:underline text-left"
                    >
                      {acc.account}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopy(`acc-${acc.id}`, acc.account)}
                      title="Copiar cuenta"
                      className="text-slate-500 hover:text-amber-300"
                    >
                      {copiedToken === `acc-${acc.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {acc.server}
                    {acc.notes ? ` · ${acc.notes}` : ''}
                  </div>
                </td>

                <td className="py-2.5 px-3 whitespace-nowrap">
                  {acc.password ? (
                    <div className="inline-flex items-center gap-2 font-mono">
                      <span className="text-slate-200">
                        {isRevealed ? acc.password : '••••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleReveal(acc.id)}
                        title={isRevealed ? 'Ocultar' : 'Mostrar'}
                        className="text-slate-500 hover:text-slate-200"
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopy(`pwd-${acc.id}`, acc.password)}
                        title="Copiar contraseña"
                        className="text-slate-500 hover:text-amber-300"
                      >
                        {copiedToken === `pwd-${acc.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                {showEmailColumn && (
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {acc.email ? (
                      <div className="inline-flex items-center gap-1.5 text-slate-300">
                        <span>{acc.email}</span>
                        <button
                          type="button"
                          onClick={() => onCopy(`em-${acc.id}`, acc.email)}
                          title="Copiar correo"
                          className="text-slate-500 hover:text-amber-300"
                        >
                          {copiedToken === `em-${acc.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )}

                <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                  {acc.ssn ? (
                    <div className="inline-flex items-center gap-2 text-slate-300">
                      <span>{isRevealed ? acc.ssn : `••••${acc.ssn.slice(-4)}`}</span>
                      <button
                        type="button"
                        onClick={() => onCopy(`ssn-${acc.id}`, acc.ssn)}
                        title="Copiar SSN"
                        className="text-slate-500 hover:text-amber-300"
                      >
                        {copiedToken === `ssn-${acc.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                <td className="py-2.5 px-3">
                  {acc.characters.length === 0 ? (
                    <span className="text-slate-500">
                      {acc.expectedCharacters
                        ? `0 / ${acc.expectedCharacters} PJ`
                        : 'Sin capturas'}
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {acc.characters.map((char, idx) => (
                        <span key={char.id}>
                          {idx > 0 && <span className="mr-2 text-slate-600">·</span>}
                          <button
                            type="button"
                            onClick={() => onSelectCharacter(char.id)}
                            className="text-amber-300 hover:underline font-medium"
                          >
                            {char.character.name}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                  {isConfirmingDelete ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onConfirmDelete(acc.id)}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium"
                      >
                        {acc.characters.length > 0
                          ? `Borrar (+${acc.characters.length} PJ)`
                          : 'Borrar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(null)}
                        className="text-slate-400 hover:text-slate-200 text-[11px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(acc)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-300"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDelete(acc.id)}
                        aria-label={`Borrar credenciales de ${acc.account}`}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface AccountCardGridProps {
  accounts: (AccountMeta & {characters: CharacterRecord[]})[];
  showAllSecrets: boolean;
  revealedIds: Record<string, boolean>;
  onToggleReveal: (id: string) => void;
  copiedToken: string | null;
  onCopy: (token: string, val: string | null | undefined) => void;
  onEdit: (acc: AccountMeta) => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
  onSelectCharacter: (characterId: string) => void;
  onSelectAccount: (accountId: string) => void;
}

function getBestLastAccess(
  accountLastAccess: string | null | undefined,
  characters: CharacterRecord[]
): string | null {
  let bestStr: string | null = accountLastAccess?.trim() || null;
  let bestMs = parseFlexibleTimestamp(bestStr);

  for (const ch of characters) {
    const candidate = ch.character.last_access?.trim();
    if (!candidate) continue;
    const ms = parseFlexibleTimestamp(candidate);
    if (!bestStr || (ms > 0 && ms > bestMs)) {
      bestStr = candidate;
      bestMs = ms;
    }
  }
  return bestStr;
}

function AccountCardGrid({
  accounts,
  showAllSecrets,
  revealedIds,
  onToggleReveal,
  copiedToken,
  onCopy,
  onEdit,
  confirmDeleteId,
  onRequestDelete,
  onConfirmDelete,
  onSelectCharacter,
  onSelectAccount,
}: AccountCardGridProps) {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {accounts.map((acc) => {
        const isRevealed = showAllSecrets || Boolean(revealedIds[acc.id]);
        const isConfirmingDelete = confirmDeleteId === acc.id;
        const resolvedLastAccess = getBestLastAccess(
          acc.lastAccess,
          acc.characters
        );
        const charCountBadge = acc.expectedCharacters
          ? `${acc.characters.length}/${acc.expectedCharacters}`
          : String(acc.characters.length);

        return (
          <article
            key={acc.id}
            className="bg-[#0B0F17] border border-[#1E293B] hover:border-slate-600 rounded-lg p-4 flex flex-col justify-between gap-4 transition-colors"
          >
            <div className="space-y-3">
              {/* Card Header: Centered Account Name + Character Count Badge */}
              <div className="relative flex items-center justify-center min-h-[26px]">
                <div className="flex items-center gap-1.5 px-8 text-center">
                  <h3 className="font-display text-base font-bold text-slate-100 truncate">
                    {acc.account}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onCopy(`card-acc-${acc.id}`, acc.account)}
                    title="Copiar cuenta"
                    className="text-slate-500 hover:text-amber-300 shrink-0"
                  >
                    {copiedToken === `card-acc-${acc.id}` ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <span
                  title={`${acc.characters.length} personajes capturados`}
                  className="absolute right-0 top-0.5 inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-[#161F30] border border-[#283548] font-mono text-[11px] font-semibold tabular-nums text-slate-300"
                >
                  {charCountBadge}
                </span>
              </div>

              {/* Two-column vertical-divider info block matching L2 account cards */}
              <div className="text-xs space-y-1.5">
                <div className="grid grid-cols-[118px_1fr] items-center">
                  <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                    Fecha creación
                  </span>
                  <span className="pl-3 font-mono tabular-nums text-slate-200 truncate">
                    {acc.creationDate || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-[118px_1fr] items-center">
                  <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                    Último acceso
                  </span>
                  <span className="pl-3 font-mono tabular-nums text-slate-200 truncate">
                    {resolvedLastAccess || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-[118px_1fr] items-center">
                  <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                    Última IP
                  </span>
                  <span className="pl-3 font-mono tabular-nums text-slate-200 truncate">
                    {acc.lastIp || '—'}
                  </span>
                </div>
              </div>

              {/* Optional Server / Notes / Characters Preview */}
              <div className="pt-2 border-t border-[#1E293B] space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-2 text-slate-500">
                  <span className="truncate">
                    {acc.server}
                    {acc.notes ? ` · ${acc.notes}` : ''}
                  </span>
                  {acc.password && (
                    <div className="inline-flex items-center gap-1.5 font-mono text-slate-300 shrink-0">
                      <span>{isRevealed ? acc.password : '••••••'}</span>
                      <button
                        type="button"
                        onClick={() => onToggleReveal(acc.id)}
                        title={isRevealed ? 'Ocultar clave' : 'Mostrar clave'}
                        className="text-slate-500 hover:text-slate-200"
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopy(`card-pwd-${acc.id}`, acc.password)}
                        title="Copiar contraseña"
                        className="text-slate-500 hover:text-amber-300"
                      >
                        {copiedToken === `card-pwd-${acc.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {acc.characters.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {acc.characters.map((char) => (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => onSelectCharacter(char.id)}
                        className="px-1.5 py-0.5 rounded bg-[#111827] border border-[#1E293B] hover:border-amber-500/50 text-amber-300 hover:text-amber-200 font-medium truncate max-w-[140px]"
                        title={`Abrir ${char.character.name}`}
                      >
                        {char.character.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500">Sin capturas importadas</div>
                )}
              </div>
            </div>

            {/* Footer Actions + Full-Width "Ver cuenta" Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(acc.id)}
                      className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                    >
                      {acc.characters.length > 0
                        ? `Confirmar (+${acc.characters.length} PJ)`
                        : 'Confirmar borrado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(null)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(acc)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-300"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(acc.id)}
                      aria-label={`Borrar credenciales de ${acc.account}`}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Borrar</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className="w-full py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs text-center transition-colors"
              >
                Ver cuenta
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

