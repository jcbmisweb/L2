import {
  Check,
  Copy,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {
  AccountMeta,
  CharacterRecord,
  ClanRecord,
  ItemCatalogEntry,
  ItemLocation,
} from '../types/l2';
import {
  CHARACTER_LOCATIONS,
  LOCATION_LABELS,
  formatAdenaShort,
  formatInt,
} from '../utils/storage';
import {ItemIcon} from './ItemIcon';

interface AccountDetailViewProps {
  accountId: string;
  accountMeta: AccountMeta | null;
  server: string;
  accountName: string;
  characters: CharacterRecord[];
  serverClans: ClanRecord[];
  itemCatalog: Record<string, ItemCatalogEntry>;
  iconBaseUrl: string;
  onQuickEditIcon: (itemName: string) => void;
  onSelectCharacter: (id: string) => void;
  onSelectClan: (id: string) => void;
  onSelectEmail?: (email: string) => void;
  onNavigateBridge: () => void;
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
  onDeleteAccount: (accountId: string) => void;
}

export function AccountDetailView({
  accountId,
  accountMeta,
  server,
  accountName,
  characters,
  serverClans,
  itemCatalog,
  iconBaseUrl,
  onQuickEditIcon,
  onSelectCharacter,
  onSelectClan,
  onSelectEmail,
  onNavigateBridge,
  onUpsertAccount,
  onDeleteAccount,
}: AccountDetailViewProps) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [rosterView, setRosterView] = useState<'cards' | 'table'>('cards');

  const [emailInput, setEmailInput] = useState(accountMeta?.email || '');
  const [passwordInput, setPasswordInput] = useState(accountMeta?.password || '');
  const [ssnInput, setSsnInput] = useState(accountMeta?.ssn || '');
  const [notesInput, setNotesInput] = useState(accountMeta?.notes || '');
  const [creationDateInput, setCreationDateInput] = useState(
    accountMeta?.creationDate || ''
  );
  const [lastAccessInput, setLastAccessInput] = useState(
    accountMeta?.lastAccess || ''
  );
  const [lastIpInput, setLastIpInput] = useState(accountMeta?.lastIp || '');

  const [activeLoc, setActiveLoc] = useState<'all' | ItemLocation>('all');
  const [charFilter, setCharFilter] = useState<string>('all');
  const [itemQuery, setItemQuery] = useState('');

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

  const summary = useMemo(() => {
    let totalAdena = 0;
    let totalItems = 0;
    const clanNames = new Set<string>();

    characters.forEach((char) => {
      if (char.clan) clanNames.add(char.clan);
      char.items.forEach((it) => {
        totalItems++;
        if (it.name.trim().toLowerCase() === 'adena' && typeof it.quantity === 'number') {
          totalAdena += it.quantity;
        }
      });
    });

    const linkedClans = Array.from(clanNames)
      .map((name) => serverClans.find((cl) => cl.name === name))
      .filter((cl): cl is ClanRecord => Boolean(cl));

    const capturedCount = characters.filter((c) => c.status === 'captured').length;
    const pendingCount = characters.filter((c) => c.status === 'pending').length;

    return {
      totalAdena,
      totalItems,
      linkedClans,
      capturedCount,
      pendingCount,
    };
  }, [characters, serverClans]);

  const allAccountItems = useMemo(() => {
    const rows: {
      characterId: string;
      characterName: string;
      item: CharacterRecord['items'][number];
    }[] = [];

    characters.forEach((char) => {
      char.items.forEach((item) => {
        rows.push({
          characterId: char.id,
          characterName: char.character.name,
          item,
        });
      });
    });

    return rows;
  }, [characters]);

  const countsByLocation = useMemo(() => {
    const map: Record<ItemLocation, number> = {
      equipped: 0,
      inventory: 0,
      warehouse: 0,
      mail: 0,
      pets: 0,
      quests: 0,
      clan_warehouse: 0,
    };
    allAccountItems.forEach((r) => {
      if (charFilter !== 'all' && r.characterId !== charFilter) return;
      map[r.item.location] = (map[r.item.location] || 0) + 1;
    });
    return map;
  }, [allAccountItems, charFilter]);

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    return allAccountItems.filter((row) => {
      if (charFilter !== 'all' && row.characterId !== charFilter) return false;
      if (activeLoc !== 'all' && row.item.location !== activeLoc) return false;
      if (q) {
        const hay = `${row.item.name} ${row.item.tags.join(' ')} ${
          row.characterName
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allAccountItems, charFilter, activeLoc, itemQuery]);

  const openEditMeta = () => {
    setEmailInput(accountMeta?.email || '');
    setPasswordInput(accountMeta?.password || '');
    setSsnInput(accountMeta?.ssn || '');
    setNotesInput(accountMeta?.notes || '');
    setCreationDateInput(accountMeta?.creationDate || '');
    setLastAccessInput(accountMeta?.lastAccess || '');
    setLastIpInput(accountMeta?.lastIp || '');
    setEditingMeta(true);
  };

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    onUpsertAccount({
      server,
      account: accountName,
      email: emailInput,
      password: passwordInput,
      ssn: ssnInput.replace(/^ssn\s*:\s*/i, ''),
      notes: notesInput,
      creationDate: creationDateInput,
      lastAccess: lastAccessInput,
      lastIp: lastIpInput,
      originalId: accountId,
    });
    setEditingMeta(false);
  };

  return (
    <div className="space-y-5">
      {/* Account Overview & Credentials */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
                Cuenta: {accountName}
              </h1>
              <span className="text-xs text-slate-400">{server}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span>Correo:</span>
                {accountMeta?.email && onSelectEmail ? (
                  <button
                    type="button"
                    onClick={() => onSelectEmail(accountMeta.email!)}
                    className="inline-flex items-center gap-1 text-amber-300 hover:underline font-medium"
                    title="Ver todas las cuentas de este correo"
                  >
                    <Mail className="w-3 h-3" />
                    <span>{accountMeta.email}</span>
                  </button>
                ) : (
                  <span>{accountMeta?.email || 'Sin asignar'}</span>
                )}
              </span>
              {accountMeta?.creationDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Creación: {accountMeta.creationDate}</span>
                </>
              )}
              {accountMeta?.lastAccess && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Último acceso: {accountMeta.lastAccess}</span>
                </>
              )}
              {accountMeta?.lastIp && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">IP: {accountMeta.lastIp}</span>
                </>
              )}
              {accountMeta?.notes && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">{accountMeta.notes}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSecrets((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              {showSecrets ? (
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
              onClick={openEditMeta}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs text-slate-200 whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar credenciales</span>
            </button>

            <button
              type="button"
              onClick={onNavigateBridge}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Añadir personaje</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmDeleteAccount((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-xs text-red-300 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar cuenta</span>
            </button>
          </div>
        </div>

        {/* Inline Delete Account Confirmation */}
        {confirmDeleteAccount && (
          <div className="bg-red-950/35 border border-red-800/70 rounded-md p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-red-200">
              ¿Seguro que quieres eliminar la cuenta{' '}
              <span className="font-bold text-white">{accountName}</span>
              {characters.length > 0
                ? ` junto con sus ${characters.length} ${
                    characters.length === 1 ? 'personaje' : 'personajes'
                  }`
                : ''}
              ? Esta acción no se puede deshacer.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteAccount(false)}
                className="px-3 py-1.5 rounded bg-[#111827] border border-[#283548] text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onDeleteAccount(accountId)}
                className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                Sí, eliminar cuenta
              </button>
            </div>
          </div>
        )}

        {/* Inline Edit Credentials Form */}
        {editingMeta && (
          <form
            onSubmit={handleSaveMeta}
            className="bg-[#0B0F17] border border-amber-500/40 rounded-md p-4 space-y-3 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Correo electrónico</label>
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="usuario@gmail.com"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Contraseña</label>
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">SSN</label>
                <input
                  type="text"
                  value={ssnInput}
                  onChange={(e) => setSsnInput(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Notas</label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Fecha creación</label>
                <input
                  type="text"
                  value={creationDateInput}
                  onChange={(e) => setCreationDateInput(e.target.value)}
                  placeholder="Ej. 19/09/2009 16:03"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Último acceso</label>
                <input
                  type="text"
                  value={lastAccessInput}
                  onChange={(e) => setLastAccessInput(e.target.value)}
                  placeholder="Ej. 11/11/2026 14:04"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Última IP</label>
                <input
                  type="text"
                  value={lastIpInput}
                  onChange={(e) => setLastIpInput(e.target.value)}
                  placeholder="Ej. 88.20.221.56"
                  className="w-full bg-[#111827] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMeta(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        {/* Consolidated Account Metrics & Credentials Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 border border-[#1E293B] rounded-md bg-[#0B0F17] divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]">
          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Personajes</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
              {summary.capturedCount}
              {accountMeta?.expectedCharacters
                ? ` / ${accountMeta.expectedCharacters}`
                : summary.pendingCount > 0
                ? ` (+${summary.pendingCount} pend.)`
                : ''}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Adena en la cuenta</div>
            <div
              title={formatInt(summary.totalAdena)}
              className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-amber-400"
            >
              {formatInt(summary.totalAdena)}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Filas de ítems</div>
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-100">
              {summary.totalItems}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Contraseña</div>
            <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-xs text-slate-200">
              <span className="truncate">
                {accountMeta?.password
                  ? showSecrets
                    ? accountMeta.password
                    : '••••••••••'
                  : '—'}
              </span>
              {accountMeta?.password && (
                <button
                  type="button"
                  onClick={() => copyValue('acc-pwd', accountMeta.password)}
                  className="text-slate-400 hover:text-amber-300 shrink-0"
                  title="Copiar contraseña"
                >
                  {copiedToken === 'acc-pwd' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">SSN</div>
            <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-xs tabular-nums text-slate-200">
              <span className="truncate">
                {accountMeta?.ssn
                  ? showSecrets
                    ? accountMeta.ssn
                    : `••••${accountMeta.ssn.slice(-4)}`
                  : '—'}
              </span>
              {accountMeta?.ssn && (
                <button
                  type="button"
                  onClick={() => copyValue('acc-ssn', accountMeta.ssn)}
                  className="text-slate-400 hover:text-amber-300 shrink-0"
                  title="Copiar SSN"
                >
                  {copiedToken === 'acc-ssn' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Linked Clans of this account */}
        {summary.linkedClans.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Clanes vinculados:</span>
            {summary.linkedClans.map((cl) => (
              <button
                key={cl.id}
                type="button"
                onClick={() => onSelectClan(cl.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0F17] border border-[#1E293B] hover:border-amber-500/50 text-amber-300"
              >
                <Shield className="w-3 h-3" />
                <span>
                  {cl.name} ({cl.items.length})
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Characters Roster of this Account */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Personajes de {accountName} ({characters.length})
            </h2>
            {accountMeta?.expectedCharacters &&
              characters.length < accountMeta.expectedCharacters && (
                <span className="font-mono text-xs text-amber-400">
                  Faltan {accountMeta.expectedCharacters - characters.length} por capturar
                </span>
              )}
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md">
            <button
              type="button"
              onClick={() => setRosterView('cards')}
              aria-label="Vista en tarjetas"
              title="Vista en tarjetas"
              className={`p-1.5 rounded transition-colors ${
                rosterView === 'cards'
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRosterView('table')}
              aria-label="Vista en tabla"
              title="Vista en tabla"
              className={`p-1.5 rounded transition-colors ${
                rosterView === 'table'
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {characters.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400 space-y-2">
            <p>Aún no has importado ningún personaje para {accountName}.</p>
            <button
              type="button"
              onClick={onNavigateBridge}
              className="text-amber-400 hover:underline font-medium"
            >
              Ir al Puente IA para importar sus capturas
            </button>
          </div>
        ) : rosterView === 'cards' ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {characters.map((char) => {
              const st = char.character;
              const charAdena = char.items.reduce((acc, it) => {
                if (
                  it.name.trim().toLowerCase() === 'adena' &&
                  typeof it.quantity === 'number'
                ) {
                  return acc + it.quantity;
                }
                return acc;
              }, 0);

              return (
                <article
                  key={char.id}
                  className={`rounded-lg border p-4 flex flex-col justify-between gap-4 transition-colors ${
                    char.status === 'pending'
                      ? 'bg-amber-950/15 border-amber-500/40'
                      : 'bg-[#0B0F17] border-[#1E293B] hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header: Clan + Character Name */}
                    <div className="flex flex-col items-center text-center gap-1">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {char.clan && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#161F30] border border-[#283548] text-[10px] font-medium text-amber-300">
                            <Shield className="w-2.5 h-2.5 shrink-0" />
                            <span>{char.clan}</span>
                          </span>
                        )}
                        <h3 className="font-display text-base font-bold text-slate-100">
                          {st.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        {char.status === 'pending' ? (
                          <span className="text-amber-400 font-medium">
                            Pendiente de capturar
                          </span>
                        ) : st.online ? (
                          <span className="text-emerald-400 font-medium">
                            Online
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Two-column vertical-divider info rows (matching L2 character panel) */}
                    <div className="text-xs space-y-1.5">
                      <div className="grid grid-cols-[112px_1fr] items-center">
                        <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                          Nivel
                        </span>
                        <span className="pl-3 font-mono tabular-nums text-slate-100">
                          {st.level ?? '—'}
                          {st.level_progress_pct !== null &&
                          st.level_progress_pct !== undefined
                            ? ` (${st.level_progress_pct}%)`
                            : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-[112px_1fr] items-center">
                        <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                          Raza
                        </span>
                        <span className="pl-3 text-slate-200 truncate">
                          {st.race || '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-[112px_1fr] items-center">
                        <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                          Profesión
                        </span>
                        <span className="pl-3 text-slate-200 truncate">
                          {st.class || '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-[112px_1fr] items-center">
                        <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                          Último acceso
                        </span>
                        <span className="pl-3 font-mono text-[11px] tabular-nums text-slate-300 truncate">
                          {st.last_access || '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-[112px_1fr] items-center">
                        <span className="pr-3 text-right font-semibold text-slate-300 border-r border-[#283548]">
                          Ubicación
                        </span>
                        <span className="pl-3 text-slate-300 truncate">
                          {st.location || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <span className="font-mono tabular-nums">
                        {char.items.length} ítems
                      </span>
                      <span className="font-mono tabular-nums text-amber-400/90">
                        {charAdena > 0 ? `${formatAdenaShort(charAdena)} Adena` : '—'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCharacter(char.id)}
                      className="w-full py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                    >
                      Ver personaje
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                  <th className="py-2.5 pl-4 pr-3">Personaje</th>
                  <th className="py-2.5 px-3">Clase · Raza</th>
                  <th className="py-2.5 px-3">Nivel</th>
                  <th className="py-2.5 px-3">Subclases</th>
                  <th className="py-2.5 px-3">Clan</th>
                  <th className="py-2.5 px-3 text-right">Adena</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Ítems</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-xs">
                {characters.map((char) => {
                  const charAdena = char.items.reduce((acc, it) => {
                    if (
                      it.name.trim().toLowerCase() === 'adena' &&
                      typeof it.quantity === 'number'
                    ) {
                      return acc + it.quantity;
                    }
                    return acc;
                  }, 0);
                  const subs = char.character.subclasses || [];

                  return (
                    <tr
                      key={char.id}
                      onClick={() => onSelectCharacter(char.id)}
                      className="cursor-pointer hover:bg-[#161F30]/60 transition-colors"
                    >
                      <td className="py-2.5 pl-4 pr-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-medium text-slate-100">
                            {char.character.name}
                          </span>
                          {char.status === 'pending' ? (
                            <span className="text-[11px] text-amber-400">
                              Pendiente
                            </span>
                          ) : char.character.online ? (
                            <span className="text-[11px] text-emerald-400">
                              Online
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-300">
                        {char.character.class || '—'}
                        {char.character.race ? ` · ${char.character.race}` : ''}
                      </td>

                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                        {char.character.level ?? '—'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400">
                        {subs.length > 0
                          ? subs.map((s) => `${s.class || '?'} (${s.level ?? '?'})`).join(' · ')
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-slate-300">
                        {char.clan || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-300">
                        {charAdena > 0 ? formatAdenaShort(charAdena) : '—'}
                      </td>

                      <td className="py-2.5 pl-3 pr-4 text-right font-mono tabular-nums text-slate-200">
                        {char.items.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consolidated Account Inventory */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1E293B] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Todos los objetos de la cuenta ({filteredItems.length})
            </h2>

            <div className="flex flex-wrap items-center gap-2.5">
              {characters.length > 1 && (
                <select
                  aria-label="Filtrar por personaje de la cuenta"
                  value={charFilter}
                  onChange={(e) => setCharFilter(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todos los personajes</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.character.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="Buscar objeto en esta cuenta..."
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
                {itemQuery && (
                  <button
                    type="button"
                    onClick={() => setItemQuery('')}
                    aria-label="Limpiar filtro"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F17] border border-[#1E293B] rounded-md w-fit">
            <button
              type="button"
              onClick={() => setActiveLoc('all')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                activeLoc === 'all'
                  ? 'bg-[#1E293B] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todo ({allAccountItems.length})
            </button>
            {CHARACTER_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setActiveLoc(loc)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeLoc === loc
                    ? 'bg-[#1E293B] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {LOCATION_LABELS[loc]} ({countsByLocation[loc]})
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            No hay objetos que coincidan en esta cuenta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#161F30]/60 text-[11px] font-medium text-slate-400">
                  <th className="py-2.5 pl-4 pr-3">Objeto</th>
                  <th className="py-2.5 px-3">Personaje</th>
                  <th className="py-2.5 px-3">Sección</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-xs">
                {filteredItems.map((row) => (
                  <tr
                    key={`${row.characterId}-${row.item.id}`}
                    className="hover:bg-[#161F30]/50 transition-colors"
                  >
                    <td className="py-2 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <ItemIcon
                          name={row.item.name}
                          itemCatalog={itemCatalog}
                          iconBaseUrl={iconBaseUrl}
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
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => onSelectCharacter(row.characterId)}
                        className="font-medium text-slate-200 hover:text-amber-300"
                      >
                        {row.characterName}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {LOCATION_LABELS[row.item.location]}
                    </td>

                    <td className="py-2.5 pl-3 pr-4 text-right font-mono tabular-nums text-slate-100 whitespace-nowrap">
                      {formatInt(row.item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
