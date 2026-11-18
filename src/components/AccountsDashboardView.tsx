import {
  Check,
  Coins,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  GitFork,
  LayoutDashboard,
  Mail,
  Minus,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {AccountMeta, CharacterRecord, L2Database} from '../types/l2';
import {parseFlexibleTimestamp} from '../utils/mergeDatabase';
import {formatAdenaShort, formatInt} from '../utils/storage';

interface AccountsDashboardViewProps {
  db: L2Database;
  selectedServer: string;
  onSelectCharacter: (characterId: string) => void;
  onSelectAccount: (accountId: string) => void;
  onSelectEmail: (email: string) => void;
  onSelectClan: (clanId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onNavigateAccounts: () => void;
  onNavigateProfessions: () => void;
}

interface DashboardAccountNode {
  meta: AccountMeta;
  characters: CharacterRecord[];
  capturedCount: number;
  pendingCount: number;
  totalAdena: number;
  totalItems: number;
  bestLastAccess: string | null;
  bestLastAccessMs: number;
  clans: string[];
}

interface DashboardEmailGroup {
  key: string;
  emailLabel: string;
  isEmpty: boolean;
  accounts: DashboardAccountNode[];
  totalCharacters: number;
  capturedCharacters: number;
  pendingCharacters: number;
  totalAdena: number;
  totalItems: number;
  latestAccess: string | null;
}

function getCharacterAdena(char: CharacterRecord): number {
  let total = 0;
  for (const it of char.items) {
    if (
      it.name.trim().toLowerCase() === 'adena' &&
      typeof it.quantity === 'number' &&
      Number.isFinite(it.quantity)
    ) {
      total += it.quantity;
    }
  }
  return total;
}

function resolveAccountLastAccess(
  accountLastAccess: string | null | undefined,
  characters: CharacterRecord[]
): {label: string | null; ms: number} {
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

  return {label: bestStr, ms: bestMs};
}

export function AccountsDashboardView({
  db,
  selectedServer,
  onSelectCharacter,
  onSelectAccount,
  onSelectEmail,
  onSelectClan,
  onDeleteAccount,
  onNavigateAccounts,
  onNavigateProfessions,
}: AccountsDashboardViewProps) {
  const [query, setQuery] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Explicit per-email overrides; undefined defaults to expanded (emails open, accounts collapsed)
  const [emailExpandOverrides, setEmailExpandOverrides] = useState<
    Record<string, boolean>
  >({});
  const [defaultEmailExpanded, setDefaultEmailExpanded] = useState(true);

  const [accountExpandOverrides, setAccountExpandOverrides] = useState<
    Record<string, boolean>
  >({});
  const [defaultAccountExpanded, setDefaultAccountExpanded] = useState(false);

  const clanIdByServerAndName = useMemo(() => {
    const map = new Map<string, string>();
    for (const cl of db.clans) {
      map.set(`${cl.server}::${cl.name.trim().toLowerCase()}`, cl.id);
    }
    return map;
  }, [db.clans]);

  // Consolidate all accounts + orphan characters grouped by email
  const {emailGroups, metrics} = useMemo(() => {
    const accountMap = new Map<
      string,
      {meta: AccountMeta; characters: CharacterRecord[]}
    >();

    for (const acc of db.accounts) {
      if (selectedServer !== 'all' && acc.server !== selectedServer) continue;
      accountMap.set(acc.id, {meta: acc, characters: []});
    }

    for (const char of db.characters) {
      if (selectedServer !== 'all' && char.server !== selectedServer) continue;
      const id = `${char.server}::${char.account}`;
      if (!accountMap.has(id)) {
        accountMap.set(id, {
          meta: {
            id,
            server: char.server,
            account: char.account,
          },
          characters: [],
        });
      }
      accountMap.get(id)!.characters.push(char);
    }

    const emailMap = new Map<string, DashboardEmailGroup>();
    let totalAccounts = 0;
    let totalCharacters = 0;
    let totalCaptured = 0;
    let totalPending = 0;
    let totalNoble = 0;
    let grandAdena = 0;
    let grandItems = 0;

    for (const {meta, characters} of accountMap.values()) {
      totalAccounts += 1;

      const sortedChars = characters.slice().sort((a, b) => {
        const lvlDiff = (b.character.level ?? -1) - (a.character.level ?? -1);
        if (lvlDiff !== 0) return lvlDiff;
        return a.character.name.localeCompare(b.character.name);
      });

      let accAdena = 0;
      let accItems = 0;
      let capturedCount = 0;
      let pendingCount = 0;
      const clanSet = new Set<string>();

      for (const ch of sortedChars) {
        totalCharacters += 1;
        if (ch.status === 'pending') {
          pendingCount += 1;
          totalPending += 1;
        } else {
          capturedCount += 1;
          totalCaptured += 1;
        }
        if (ch.character.noble) totalNoble += 1;
        const chAdena = getCharacterAdena(ch);
        accAdena += chAdena;
        accItems += ch.items.length;
        if (ch.clan) clanSet.add(ch.clan);
      }

      grandAdena += accAdena;
      grandItems += accItems;

      const {label: bestLastAccess, ms: bestLastAccessMs} =
        resolveAccountLastAccess(meta.lastAccess, sortedChars);

      const node: DashboardAccountNode = {
        meta,
        characters: sortedChars,
        capturedCount,
        pendingCount,
        totalAdena: accAdena,
        totalItems: accItems,
        bestLastAccess,
        bestLastAccessMs,
        clans: Array.from(clanSet).sort((a, b) => a.localeCompare(b)),
      };

      const rawEmail = meta.email?.trim() || '';
      const key = rawEmail ? rawEmail.toLowerCase() : '__sin_correo__';
      const emailLabel = rawEmail || 'Sin correo asignado';

      if (!emailMap.has(key)) {
        emailMap.set(key, {
          key,
          emailLabel,
          isEmpty: !rawEmail,
          accounts: [],
          totalCharacters: 0,
          capturedCharacters: 0,
          pendingCharacters: 0,
          totalAdena: 0,
          totalItems: 0,
          latestAccess: null,
        });
      }

      const group = emailMap.get(key)!;
      group.accounts.push(node);
      group.totalCharacters += sortedChars.length;
      group.capturedCharacters += capturedCount;
      group.pendingCharacters += pendingCount;
      group.totalAdena += accAdena;
      group.totalItems += accItems;
    }

    const groups = Array.from(emailMap.values()).map((group) => {
      group.accounts.sort((a, b) =>
        a.meta.account.localeCompare(b.meta.account)
      );
      let latestMs = 0;
      let latestLabel: string | null = null;
      for (const acc of group.accounts) {
        if (
          acc.bestLastAccess &&
          (!latestLabel || acc.bestLastAccessMs > latestMs)
        ) {
          latestLabel = acc.bestLastAccess;
          latestMs = acc.bestLastAccessMs;
        }
      }
      return {
        ...group,
        latestAccess: latestLabel,
      };
    });

    groups.sort((a, b) => {
      if (a.isEmpty && !b.isEmpty) return 1;
      if (!a.isEmpty && b.isEmpty) return -1;
      return a.emailLabel.localeCompare(b.emailLabel);
    });

    const distinctEmailsCount = groups.filter((g) => !g.isEmpty).length;
    const unassignedAccountsCount =
      groups.find((g) => g.isEmpty)?.accounts.length || 0;

    return {
      emailGroups: groups,
      metrics: {
        distinctEmailsCount,
        unassignedAccountsCount,
        totalAccounts,
        totalCharacters,
        totalCaptured,
        totalPending,
        totalNoble,
        grandAdena,
        grandItems,
      },
    };
  }, [db.accounts, db.characters, selectedServer]);

  // Apply search filtering while tracking whether a group/account matched
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return emailGroups.map((g) => ({
        group: g,
        matchingAccounts: g.accounts.map((acc) => ({
          acc,
          matchingCharacters: acc.characters,
          forceExpandAccount: false,
        })),
        forceExpandEmail: false,
      }));
    }

    const result: {
      group: DashboardEmailGroup;
      matchingAccounts: {
        acc: DashboardAccountNode;
        matchingCharacters: CharacterRecord[];
        forceExpandAccount: boolean;
      }[];
      forceExpandEmail: boolean;
    }[] = [];

    for (const group of emailGroups) {
      const emailMatches = group.emailLabel.toLowerCase().includes(q);
      const matchingAccounts: {
        acc: DashboardAccountNode;
        matchingCharacters: CharacterRecord[];
        forceExpandAccount: boolean;
      }[] = [];

      for (const acc of group.accounts) {
        const accountMatches =
          acc.meta.account.toLowerCase().includes(q) ||
          acc.meta.server.toLowerCase().includes(q) ||
          (acc.meta.notes || '').toLowerCase().includes(q) ||
          (acc.meta.lastIp || '').toLowerCase().includes(q);

        const charMatches = acc.characters.filter((ch) => {
          const subMatch = (ch.character.subclasses || []).some((sub) =>
            (sub.class || '').toLowerCase().includes(q)
          );
          return (
            ch.character.name.toLowerCase().includes(q) ||
            (ch.character.class || '').toLowerCase().includes(q) ||
            (ch.character.race || '').toLowerCase().includes(q) ||
            (ch.character.location || '').toLowerCase().includes(q) ||
            (ch.clan || '').toLowerCase().includes(q) ||
            subMatch
          );
        });

        if (emailMatches || accountMatches || charMatches.length > 0) {
          matchingAccounts.push({
            acc,
            matchingCharacters:
              accountMatches || emailMatches ? acc.characters : charMatches,
            forceExpandAccount: charMatches.length > 0,
          });
        }
      }

      if (matchingAccounts.length > 0) {
        result.push({
          group,
          matchingAccounts,
          forceExpandEmail: true,
        });
      }
    }

    return result;
  }, [emailGroups, query]);

  const copyValue = (token: string, val: string | null | undefined) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken((prev) => (prev === token ? null : prev));
    }, 1500);
  };

  const isEmailOpen = (key: string, forceExpand: boolean) => {
    if (query.trim() && forceExpand) return true;
    return emailExpandOverrides[key] ?? defaultEmailExpanded;
  };

  const isAccountOpen = (id: string, forceExpand: boolean) => {
    if (query.trim() && forceExpand) return true;
    return accountExpandOverrides[id] ?? defaultAccountExpanded;
  };

  const toggleEmail = (key: string) => {
    const current = emailExpandOverrides[key] ?? defaultEmailExpanded;
    setEmailExpandOverrides((prev) => ({...prev, [key]: !current}));
  };

  const toggleAccount = (id: string) => {
    const current = accountExpandOverrides[id] ?? defaultAccountExpanded;
    setAccountExpandOverrides((prev) => ({...prev, [id]: !current}));
  };

  const applyPresetLevel = (level: 'emails' | 'accounts' | 'all') => {
    setEmailExpandOverrides({});
    setAccountExpandOverrides({});
    if (level === 'emails') {
      setDefaultEmailExpanded(false);
      setDefaultAccountExpanded(false);
    } else if (level === 'accounts') {
      setDefaultEmailExpanded(true);
      setDefaultAccountExpanded(false);
    } else {
      setDefaultEmailExpanded(true);
      setDefaultAccountExpanded(true);
    }
  };

  const activePreset: 'emails' | 'accounts' | 'all' | 'custom' =
    Object.keys(emailExpandOverrides).length > 0 ||
    Object.keys(accountExpandOverrides).length > 0
      ? 'custom'
      : !defaultEmailExpanded && !defaultAccountExpanded
      ? 'emails'
      : defaultEmailExpanded && !defaultAccountExpanded
      ? 'accounts'
      : 'all';

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-5 h-5 text-amber-400 shrink-0" />
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
                Panel de Cuentas y Personajes
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Vista rápida en árbol desplegable con{' '}
              <span className="font-mono text-slate-200">+</span> /{' '}
              <span className="font-mono text-slate-200">−</span> para recorrer
              correos, cuentas y personajes en segundos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNavigateAccounts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs font-medium text-slate-200"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Gestionar cuentas</span>
            </button>
            <button
              type="button"
              onClick={onNavigateProfessions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161F30] hover:bg-[#1E293B] border border-[#283548] text-xs font-medium text-slate-200"
            >
              <GitFork className="w-3.5 h-3.5 text-cyan-400" />
              <span>Profesiones y familias</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#1E293B] rounded-md bg-[#0B0F17] divide-y lg:divide-y-0 lg:divide-x divide-[#1E293B]">
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Correos</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold tabular-nums text-slate-100">
                {metrics.distinctEmailsCount}
              </span>
              {metrics.unassignedAccountsCount > 0 && (
                <span className="text-[11px] text-slate-500">
                  +{metrics.unassignedAccountsCount} sin asignar
                </span>
              )}
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cuentas</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold tabular-nums text-slate-100">
                {metrics.totalAccounts}
              </span>
              <span className="text-[11px] text-slate-500">
                {selectedServer === 'all' ? 'en todos los servidores' : selectedServer}
              </span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Personajes</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold tabular-nums text-slate-100">
                {metrics.totalCharacters}
              </span>
              <span className="text-[11px] text-slate-500">
                {metrics.totalNoble > 0
                  ? `${metrics.totalNoble} Noble`
                  : `${metrics.totalCaptured} capturados`}
                {metrics.totalPending > 0 ? ` · ${metrics.totalPending} pend.` : ''}
              </span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Adena en cuentas</span>
            </div>
            <div
              title={`${formatInt(metrics.grandAdena)} Adena`}
              className="mt-1 flex items-baseline gap-2"
            >
              <span className="font-mono text-lg font-bold tabular-nums text-amber-400">
                {formatAdenaShort(metrics.grandAdena)}
              </span>
              <span className="text-[11px] text-slate-500">
                · {formatInt(metrics.grandItems)} filas de ítems
              </span>
            </div>
          </div>
        </div>

        {/* Search & Expand Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar correo, cuenta, personaje, profesión, clan o IP..."
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hierarchy depth presets */}
            <div className="inline-flex items-center bg-[#0B0F17] border border-[#1E293B] rounded-md p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => applyPresetLevel('emails')}
                className={`px-2.5 py-1.5 rounded transition-colors ${
                  activePreset === 'emails'
                    ? 'bg-[#1E293B] text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solo correos
              </button>
              <button
                type="button"
                onClick={() => applyPresetLevel('accounts')}
                className={`px-2.5 py-1.5 rounded transition-colors ${
                  activePreset === 'accounts'
                    ? 'bg-[#1E293B] text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Correos + Cuentas
              </button>
              <button
                type="button"
                onClick={() => applyPresetLevel('all')}
                className={`px-2.5 py-1.5 rounded transition-colors ${
                  activePreset === 'all'
                    ? 'bg-[#1E293B] text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todo abierto (+)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSecrets((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B0F17] hover:bg-[#161F30] border border-[#1E293B] text-xs text-slate-300"
            >
              {showSecrets ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ocultar claves</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver claves</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Hierarchical Tree: Email -> Account -> Characters */}
      {filteredGroups.length === 0 ? (
        <section className="bg-[#111827] border border-[#1E293B] rounded-lg px-6 py-12 text-center text-xs text-slate-400 space-y-2">
          <p>
            {query
              ? 'No hay correos, cuentas ni personajes que coincidan con la búsqueda.'
              : 'Aún no hay cuentas ni personajes registrados.'}
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(({group, matchingAccounts, forceExpandEmail}) => {
            const emailExpanded = isEmailOpen(group.key, forceExpandEmail);

            return (
              <section
                key={group.key}
                className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden"
              >
                {/* LEVEL 1: Email Row */}
                <div className="px-4 py-3 bg-[#161F30]/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleEmail(group.key)}
                      aria-label={
                        emailExpanded
                          ? `Contraer ${group.emailLabel}`
                          : `Desplegar ${group.emailLabel}`
                      }
                      aria-expanded={emailExpanded}
                      className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        emailExpanded
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25'
                          : 'bg-[#0B0F17] border-[#283548] text-slate-200 hover:border-amber-500/50 hover:text-amber-300'
                      }`}
                    >
                      {emailExpanded ? (
                        <Minus className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleEmail(group.key)}
                      className="flex items-center gap-2 min-w-0 text-left"
                    >
                      <Mail
                        className={`w-4 h-4 shrink-0 ${
                          group.isEmpty ? 'text-slate-500' : 'text-amber-400'
                        }`}
                      />
                      <span
                        className={`font-display text-sm font-bold truncate ${
                          group.isEmpty ? 'text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {group.emailLabel}
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#0B0F17] border border-[#1E293B] font-mono tabular-nums text-cyan-300">
                        {group.accounts.length}{' '}
                        {group.accounts.length === 1 ? 'cuenta' : 'cuentas'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#0B0F17] border border-[#1E293B] font-mono tabular-nums text-slate-300">
                        {group.totalCharacters} PJ
                      </span>
                      {group.totalAdena > 0 && (
                        <span
                          title={`${formatInt(group.totalAdena)} Adena`}
                          className="px-2 py-0.5 rounded bg-[#0B0F17] border border-[#1E293B] font-mono tabular-nums text-amber-400"
                        >
                          {formatAdenaShort(group.totalAdena)} Adena
                        </span>
                      )}
                      {group.latestAccess && (
                        <span className="hidden sm:inline font-mono text-slate-400">
                          · Últ. acceso: {group.latestAccess}
                        </span>
                      )}
                    </div>
                  </div>

                  {!group.isEmpty && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(`dash-mail-${group.key}`, group.emailLabel)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0F17] border border-[#1E293B] text-[11px] text-slate-300 hover:text-amber-300"
                      >
                        {copiedToken === `dash-mail-${group.key}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectEmail(group.emailLabel)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0F17] border border-[#1E293B] text-[11px] text-cyan-300 hover:border-cyan-500/50"
                        title="Abrir tarjetas de este correo"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Tarjetas</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* LEVEL 2: Accounts inside this Email */}
                {emailExpanded && (
                  <div className="divide-y divide-[#1E293B] border-t border-[#1E293B]">
                    {matchingAccounts.map(
                      ({acc, matchingCharacters, forceExpandAccount}) => {
                        const accountExpanded = isAccountOpen(
                          acc.meta.id,
                          forceExpandAccount
                        );
                        const charCountText = acc.meta.expectedCharacters
                          ? `${acc.characters.length}/${acc.meta.expectedCharacters}`
                          : `${acc.characters.length}`;

                        return (
                          <div key={acc.meta.id} className="bg-[#0B0F17]/40">
                            {/* Account Header Row */}
                            <div className="px-4 py-2.5 pl-6 sm:pl-9 flex flex-wrap items-center justify-between gap-3 hover:bg-[#161F30]/35 transition-colors">
                              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleAccount(acc.meta.id)}
                                  aria-label={
                                    accountExpanded
                                      ? `Ocultar personajes de ${acc.meta.account}`
                                      : `Desplegar personajes de ${acc.meta.account}`
                                  }
                                  aria-expanded={accountExpanded}
                                  className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    accountExpanded
                                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25'
                                      : 'bg-[#111827] border-[#283548] text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300'
                                  }`}
                                >
                                  {accountExpanded ? (
                                    <Minus className="w-3.5 h-3.5" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleAccount(acc.meta.id)}
                                  className="inline-flex items-center gap-2 text-left"
                                >
                                  <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="font-display text-sm font-semibold text-slate-100">
                                    {acc.meta.account}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    copyValue(
                                      `dash-acc-${acc.meta.id}`,
                                      acc.meta.account
                                    )
                                  }
                                  title="Copiar nombre de cuenta"
                                  className="text-slate-500 hover:text-amber-300"
                                >
                                  {copiedToken === `dash-acc-${acc.meta.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>

                                <span className="px-1.5 py-0.5 rounded bg-[#111827] border border-[#1E293B] font-mono text-[11px] tabular-nums text-slate-300">
                                  {charCountText} PJ
                                </span>

                                <span className="text-[11px] text-slate-500">
                                  {acc.meta.server}
                                </span>

                                {acc.meta.notes && (
                                  <span className="text-[11px] text-amber-300/80">
                                    · {acc.meta.notes}
                                  </span>
                                )}
                              </div>

                              {/* Right metadata + Ver cuenta */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                                {acc.bestLastAccess && (
                                  <span className="font-mono text-slate-400">
                                    Acceso:{' '}
                                    <span className="text-slate-200">
                                      {acc.bestLastAccess}
                                    </span>
                                  </span>
                                )}
                                {acc.meta.lastIp && (
                                  <span className="hidden md:inline font-mono text-slate-400">
                                    IP:{' '}
                                    <span className="text-slate-300">
                                      {acc.meta.lastIp}
                                    </span>
                                  </span>
                                )}
                                {acc.totalAdena > 0 && (
                                  <span
                                    title={`${formatInt(acc.totalAdena)} Adena`}
                                    className="font-mono tabular-nums text-amber-400"
                                  >
                                    {formatAdenaShort(acc.totalAdena)} Adena
                                  </span>
                                )}

                                {showSecrets && acc.meta.password && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] font-mono text-slate-200">
                                    <span>{acc.meta.password}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        copyValue(
                                          `dash-pwd-${acc.meta.id}`,
                                          acc.meta.password
                                        )
                                      }
                                      title="Copiar contraseña"
                                      className="text-slate-400 hover:text-amber-300"
                                    >
                                      {copiedToken ===
                                      `dash-pwd-${acc.meta.id}` ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onSelectAccount(acc.meta.id)}
                                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] transition-colors"
                                >
                                  Ver cuenta
                                </button>

                                {confirmDeleteId === acc.meta.id ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteAccount(acc.meta.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px]"
                                    >
                                      {acc.characters.length > 0
                                        ? `Borrar (+${acc.characters.length} PJ)`
                                        : 'Borrar'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="text-slate-400 hover:text-slate-200 text-[11px]"
                                    >
                                      Cancelar
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeleteId(acc.meta.id)
                                    }
                                    aria-label={`Eliminar cuenta ${acc.meta.account}`}
                                    title={`Eliminar cuenta ${acc.meta.account}`}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* LEVEL 3: Characters inside this Account */}
                            {accountExpanded && (
                              <div className="px-4 pb-3 pt-1 pl-10 sm:pl-16 bg-[#080B12]/70 border-t border-[#1E293B]/60">
                                {matchingCharacters.length === 0 ? (
                                  <div className="py-2 text-xs text-slate-500">
                                    Esta cuenta aún no tiene personajes capturados.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-2">
                                    {matchingCharacters.map((char) => {
                                      const st = char.character;
                                      const charAdena = getCharacterAdena(char);
                                      const clanId = char.clan
                                        ? clanIdByServerAndName.get(
                                            `${char.server}::${char.clan
                                              .trim()
                                              .toLowerCase()}`
                                          )
                                        : undefined;
                                      const subclassSummary = (
                                        st.subclasses || []
                                      )
                                        .filter((s) => s.class)
                                        .map(
                                          (s) =>
                                            `${s.class}${
                                              s.level ? ` (${s.level})` : ''
                                            }`
                                        )
                                        .join(' · ');

                                      return (
                                        <div
                                          key={char.id}
                                          className={`rounded-md border p-3 flex flex-col justify-between gap-2.5 text-xs transition-colors ${
                                            char.status === 'pending'
                                              ? 'bg-amber-950/15 border-amber-500/40'
                                              : 'bg-[#111827] border-[#1E293B] hover:border-slate-600'
                                          }`}
                                        >
                                          <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    onSelectCharacter(char.id)
                                                  }
                                                  className="font-display text-sm font-bold text-slate-100 hover:text-amber-300 truncate block text-left"
                                                >
                                                  {st.name}
                                                </button>
                                                <div className="text-[11px] text-slate-400 truncate">
                                                  {st.class || 'Sin profesión'}
                                                  {st.race ? ` · ${st.race}` : ''}
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-1.5 shrink-0">
                                                {char.status === 'pending' ? (
                                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-medium">
                                                    Pendiente
                                                  </span>
                                                ) : (
                                                  <span className="px-1.5 py-0.5 rounded bg-[#0B0F17] border border-[#283548] font-mono text-[11px] font-semibold tabular-nums text-amber-300">
                                                    Nv {st.level ?? '?'}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400">
                                              {char.clan &&
                                                (clanId ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      onSelectClan(clanId)
                                                    }
                                                    className="inline-flex items-center gap-1 text-amber-300 hover:underline"
                                                  >
                                                    <Shield className="w-3 h-3 shrink-0" />
                                                    <span>{char.clan}</span>
                                                  </button>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 text-slate-300">
                                                    <Shield className="w-3 h-3 shrink-0" />
                                                    <span>{char.clan}</span>
                                                  </span>
                                                ))}
                                              {st.location && (
                                                <span className="truncate">
                                                  {st.location}
                                                </span>
                                              )}
                                              {st.online && (
                                                <span className="text-emerald-400 font-medium">
                                                  Online
                                                </span>
                                              )}
                                            </div>

                                            {subclassSummary && (
                                              <div
                                                title={subclassSummary}
                                                className="text-[10px] text-slate-500 truncate"
                                              >
                                                Sub: {subclassSummary}
                                              </div>
                                            )}
                                          </div>

                                          <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-2 text-[11px]">
                                            <span className="font-mono tabular-nums text-slate-400 truncate">
                                              {char.items.length} ítems
                                              {charAdena > 0
                                                ? ` · ${formatAdenaShort(
                                                    charAdena
                                                  )} Adena`
                                                : ''}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                onSelectCharacter(char.id)
                                              }
                                              className="px-2 py-1 rounded bg-cyan-600/90 hover:bg-cyan-500 text-white font-semibold shrink-0 transition-colors"
                                            >
                                              Ver personaje
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
