import {
  Database,
  Download,
  GitFork,
  Image as ImageIcon,
  Mail,
  Search,
  Shield,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import {useMemo} from 'react';
import {ActiveView, CharacterRecord, L2Database} from '../types/l2';

interface SidebarProps {
  db: L2Database;
  servers: string[];
  selectedServer: string;
  onSelectServer: (server: string) => void;
  activeView: ActiveView;
  selectedCharacterId: string | null;
  selectedClanId: string | null;
  selectedAccountId: string | null;
  onNavigateSearch: () => void;
  onNavigateBridge: () => void;
  onNavigateCatalog: () => void;
  onNavigateAccounts: () => void;
  onNavigateProfessions: () => void;
  onNavigateDownloads: () => void;
  onSelectCharacter: (id: string) => void;
  onSelectClan: (id: string) => void;
  onSelectAccount: (accountId: string) => void;
  onOpenBackup: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  db,
  servers,
  selectedServer,
  onSelectServer,
  activeView,
  selectedCharacterId,
  selectedClanId,
  selectedAccountId,
  onNavigateSearch,
  onNavigateBridge,
  onNavigateCatalog,
  onNavigateAccounts,
  onNavigateProfessions,
  onNavigateDownloads,
  onSelectCharacter,
  onSelectClan,
  onSelectAccount,
  onOpenBackup,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const filteredAccounts = useMemo(() => {
    const accountKeys = new Map<
      string,
      {
        account: string;
        server: string;
        expectedCharacters?: number | null;
        characters: CharacterRecord[];
      }
    >();

    db.accounts.forEach((acc) => {
      if (selectedServer !== 'all' && acc.server !== selectedServer) return;
      accountKeys.set(acc.id, {
        account: acc.account,
        server: acc.server,
        expectedCharacters: acc.expectedCharacters,
        characters: [],
      });
    });

    db.characters.forEach((char) => {
      if (selectedServer !== 'all' && char.server !== selectedServer) return;
      const key = `${char.server}::${char.account}`;
      if (!accountKeys.has(key)) {
        accountKeys.set(key, {
          account: char.account,
          server: char.server,
          characters: [],
        });
      }
      accountKeys.get(key)!.characters.push(char);
    });

    return Array.from(accountKeys.values()).sort((a, b) =>
      a.account.localeCompare(b.account)
    );
  }, [db.accounts, db.characters, selectedServer]);

  const filteredClans = useMemo(() => {
    return db.clans
      .filter((cl) => selectedServer === 'all' || cl.server === selectedServer)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.clans, selectedServer]);

  const uncertainTotal = useMemo(() => {
    let count = 0;
    db.characters.forEach((c) => {
      c.items.forEach((i) => {
        if (i.uncertain) count++;
      });
    });
    db.clans.forEach((cl) => {
      cl.items.forEach((i) => {
        if (i.uncertain) count++;
      });
    });
    return count;
  }, [db.characters, db.clans]);

  const content = (
    <div className="flex h-full flex-col bg-[#111827] border-r border-[#1E293B] text-slate-200">
      {/* Brand header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#1E293B] shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigateSearch();
            onCloseMobile();
          }}
          className="text-left font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
        >
          L2ES Vault
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Cerrar menú lateral"
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <div className="p-3 space-y-1 border-b border-[#1E293B]">
        <button
          type="button"
          onClick={() => {
            onNavigateSearch();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            activeView === 'search'
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
          }`}
        >
          <span className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 shrink-0" />
            <span>Buscador de ítems</span>
          </span>
          {uncertainTotal > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-amber-400">
              {uncertainTotal} rev.
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateBridge();
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            activeView === 'bridge'
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Puente IA (Prompt / JSON)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateCatalog();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            activeView === 'catalog'
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
          }`}
        >
          <span className="flex items-center gap-2.5 truncate">
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>Base de ítems</span>
          </span>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {Object.keys(db.itemCatalog || {}).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateAccounts();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            activeView === 'accounts'
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
          }`}
        >
          <span className="flex items-center gap-2.5 truncate">
            <Mail className="w-4 h-4 shrink-0" />
            <span>Cuentas por correo</span>
          </span>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {filteredAccounts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateProfessions();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            activeView === 'professions'
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
          }`}
        >
          <span className="flex items-center gap-2.5 truncate">
            <GitFork className="w-4 h-4 shrink-0" />
            <span>Profesiones y familias</span>
          </span>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {db.characters.filter(
              (c) => selectedServer === 'all' || c.server === selectedServer
            ).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateDownloads();
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            activeView === 'downloads'
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
          }`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Descargar datos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenBackup();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-[#161F30] hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          <Database className="w-4 h-4 shrink-0" />
          <span>Respaldo JSON</span>
        </button>
      </div>

      {/* Server Filter */}
      <div className="px-3 py-2.5 border-b border-[#1E293B]">
        <label
          htmlFor="sidebar-server-filter"
          className="block text-[11px] font-medium text-slate-400 mb-1.5"
        >
          Servidor activo
        </label>
        <select
          id="sidebar-server-filter"
          value={selectedServer}
          onChange={(e) => onSelectServer(e.target.value)}
          className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Todos los servidores ({servers.length})</option>
          {servers.map((srv) => (
            <option key={srv} value={srv}>
              {srv}
            </option>
          ))}
        </select>
      </div>

      {/* Scrollable Clans & Accounts Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* Clans section */}
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-xs font-semibold text-slate-400">Clanes</span>
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {filteredClans.length}
            </span>
          </div>

          {filteredClans.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-slate-500">
              Sin almacenes de clan aún.
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredClans.map((clan) => {
                const isSelected =
                  activeView === 'clan' && selectedClanId === clan.id;
                const memberCount = db.characters.filter(
                  (c) => c.server === clan.server && c.clan === clan.name
                ).length;

                return (
                  <button
                    key={clan.id}
                    type="button"
                    onClick={() => {
                      onSelectClan(clan.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Shield className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate font-medium">{clan.name}</span>
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                      {clan.items.length} · {memberCount} PJ
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Accounts & Characters section */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-slate-400">
              Cuentas y personajes
            </span>
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {filteredAccounts.length}
            </span>
          </div>

          {filteredAccounts.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-slate-500">
              Importa una captura desde el Puente IA para registrar tus cuentas.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredAccounts.map((accGroup) => {
                const capturedCount = accGroup.characters.filter(
                  (c) => c.status === 'captured'
                ).length;
                const totalLabel = accGroup.expectedCharacters
                  ? `${capturedCount}/${accGroup.expectedCharacters}`
                  : `${capturedCount}`;

                const accountId = `${accGroup.server}::${accGroup.account}`;
                const isAccountSelected =
                  activeView === 'account' && selectedAccountId === accountId;

                return (
                  <div key={accountId} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAccount(accountId);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 ${
                        isAccountSelected
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'text-slate-400 hover:bg-[#161F30] hover:text-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        <Users
                          className={`w-3 h-3 shrink-0 ${
                            isAccountSelected ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        />
                        <span className="truncate">{accGroup.account}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 shrink-0">
                        {totalLabel}
                      </span>
                    </button>

                    {accGroup.characters.length === 0 ? (
                      <div className="px-3 py-1.5 text-[11px] text-slate-500">
                        Sin personajes capturados
                      </div>
                    ) : (
                      <div className="space-y-0.5 pl-1">
                        {accGroup.characters
                          .slice()
                          .sort((a, b) =>
                            a.character.name.localeCompare(b.character.name)
                          )
                          .map((char) => {
                            const isSelected =
                              activeView === 'character' &&
                              selectedCharacterId === char.id;
                            const isPending = char.status === 'pending';

                            return (
                              <button
                                key={char.id}
                                type="button"
                                onClick={() => {
                                  onSelectCharacter(char.id);
                                  onCloseMobile();
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 ${
                                  isSelected
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'text-slate-300 hover:bg-[#161F30] hover:text-slate-100'
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <User className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                  <span
                                    className={`truncate ${
                                      isPending ? 'text-slate-400' : 'font-medium'
                                    }`}
                                  >
                                    {char.character.name}
                                  </span>
                                </span>
                                <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                                  {isPending
                                    ? 'Pendiente'
                                    : `Nv ${char.character.level ?? '?'}`}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-[270px] max-w-[85vw] h-full z-10">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
