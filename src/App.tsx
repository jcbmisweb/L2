import {useMemo, useState} from 'react';
import {AccountDetailView} from './components/AccountDetailView';
import {AccountsDashboardView} from './components/AccountsDashboardView';
import {AccountsDirectoryView} from './components/AccountsDirectoryView';
import {AiBridgeView} from './components/AiBridgeView';
import {ArmorSetsView} from './components/ArmorSetsView';
import {BackupModal} from './components/BackupModal';
import {CharacterDetailView} from './components/CharacterDetailView';
import {ClanDetailView} from './components/ClanDetailView';
import {DownloadsView} from './components/DownloadsView';
import {EpicJewelsView} from './components/EpicJewelsView';
import {GlobalSearchView} from './components/GlobalSearchView';
import {ItemCatalogView} from './components/ItemCatalogView';
import {ProfessionsView} from './components/ProfessionsView';
import {QuickIconModal} from './components/QuickIconModal';
import {Sidebar} from './components/Sidebar';
import {TopBar} from './components/TopBar';
import {useL2Database} from './hooks/useL2Database';
import {ActiveView} from './types/l2';

export default function App() {
  const {
    db,
    servers,
    applyImport,
    assignCharacterClan,
    updateCharacter,
    updateClan,
    deleteCharacter,
    deleteClan,
    addItemEntry,
    updateItemEntry,
    deleteItemEntry,
    updateItemSlot,
    upsertCatalogEntry,
    bulkUpsertCatalog,
    deleteItemGlobally,
    setIconBaseUrl,
    setArmorSetImage,
    upsertAccount,
    bulkUpsertAccounts,
    applyPartialItemsImport,
    deleteAccount,
    restoreBackup,
    resetToEmpty,
    loadStarterDemo,
  } = useL2Database();

  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [activeView, setActiveView] = useState<ActiveView>('search');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedClanId, setSelectedClanId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedEmailFilter, setSelectedEmailFilter] = useState<string | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickIconItemName, setQuickIconItemName] = useState<string | null>(null);

  const selectedCharacter = useMemo(
    () => db.characters.find((c) => c.id === selectedCharacterId) || null,
    [db.characters, selectedCharacterId]
  );

  const selectedClan = useMemo(
    () => db.clans.find((cl) => cl.id === selectedClanId) || null,
    [db.clans, selectedClanId]
  );

  const selectedAccountInfo = useMemo(() => {
    if (!selectedAccountId) return null;
    const accountMeta =
      db.accounts.find((a) => a.id === selectedAccountId) || null;
    const characters = db.characters.filter(
      (c) => `${c.server}::${c.account}` === selectedAccountId
    );
    if (!accountMeta && characters.length === 0) return null;

    const sepIdx = selectedAccountId.indexOf('::');
    const fallbackServer =
      sepIdx >= 0 ? selectedAccountId.slice(0, sepIdx) : 'Valakas [x10]';
    const fallbackAccount =
      sepIdx >= 0 ? selectedAccountId.slice(sepIdx + 2) : selectedAccountId;

    return {
      accountId: selectedAccountId,
      accountMeta,
      server: accountMeta?.server || characters[0]?.server || fallbackServer,
      accountName:
        accountMeta?.account || characters[0]?.account || fallbackAccount,
      characters: characters
        .slice()
        .sort((a, b) => a.character.name.localeCompare(b.character.name)),
    };
  }, [db.accounts, db.characters, selectedAccountId]);

  const breadcrumbs = useMemo(() => {
    const serverLabel =
      selectedServer === 'all' ? 'Todos los servidores' : selectedServer;
    if (activeView === 'dashboard') {
      return [serverLabel, 'Panel de cuentas y personajes'];
    }
    if (activeView === 'search') {
      return [serverLabel, 'Buscador de ítems'];
    }
    if (activeView === 'bridge') {
      return [serverLabel, 'Puente IA'];
    }
    if (activeView === 'catalog') {
      return ['Catálogo global', 'Base de datos de ítems'];
    }
    if (activeView === 'accounts') {
      return [serverLabel, 'Cuentas por correo'];
    }
    if (activeView === 'professions') {
      return [serverLabel, 'Profesiones y familias'];
    }
    if (activeView === 'armors') {
      return [serverLabel, 'Colección de Armaduras (Sets)'];
    }
    if (activeView === 'epics') {
      return [serverLabel, 'Joyas épicas y especiales'];
    }
    if (activeView === 'downloads') {
      return [serverLabel, 'Descargar y subir datos'];
    }
    if (activeView === 'account' && selectedAccountInfo) {
      return [
        selectedAccountInfo.server,
        'Cuentas',
        selectedAccountInfo.accountName,
      ];
    }
    if (activeView === 'character' && selectedCharacter) {
      return [
        selectedCharacter.server,
        selectedCharacter.account,
        selectedCharacter.character.name,
      ];
    }
    if (activeView === 'clan' && selectedClan) {
      return [selectedClan.server, 'Clanes', selectedClan.name];
    }
    return [serverLabel, 'Buscador de ítems'];
  }, [
    activeView,
    selectedServer,
    selectedAccountInfo,
    selectedCharacter,
    selectedClan,
  ]);

  const handleOpenCharacter = (id: string) => {
    setSelectedCharacterId(id);
    setActiveView('character');
  };

  const handleOpenClan = (id: string) => {
    setSelectedClanId(id);
    setActiveView('clan');
  };

  const handleOpenAccount = (id: string) => {
    setSelectedAccountId(id);
    setActiveView('account');
  };

  const handleOpenEmail = (email: string) => {
    setSelectedEmailFilter(email);
    setActiveView('accounts');
  };

  const handleDeleteAccount = (accountId: string) => {
    const targetChar = selectedCharacterId
      ? db.characters.find((c) => c.id === selectedCharacterId)
      : null;
    deleteAccount(accountId);
    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
      if (activeView === 'account') {
        setActiveView('accounts');
      }
    }
    if (
      targetChar &&
      `${targetChar.server}::${targetChar.account}` === accountId
    ) {
      setSelectedCharacterId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex">
      <Sidebar
        db={db}
        servers={servers}
        selectedServer={selectedServer}
        onSelectServer={setSelectedServer}
        activeView={activeView}
        selectedCharacterId={selectedCharacterId}
        selectedClanId={selectedClanId}
        selectedAccountId={selectedAccountId}
        onNavigateDashboard={() => setActiveView('dashboard')}
        onNavigateSearch={() => setActiveView('search')}
        onNavigateBridge={() => setActiveView('bridge')}
        onNavigateCatalog={() => setActiveView('catalog')}
        onNavigateAccounts={() => {
          setSelectedEmailFilter(null);
          setActiveView('accounts');
        }}
        onNavigateProfessions={() => setActiveView('professions')}
        onNavigateArmors={() => setActiveView('armors')}
        onNavigateEpics={() => setActiveView('epics')}
        onNavigateDownloads={() => setActiveView('downloads')}
        onSelectCharacter={handleOpenCharacter}
        onSelectClan={handleOpenClan}
        onSelectAccount={handleOpenAccount}
        onOpenBackup={() => setBackupModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          breadcrumbs={breadcrumbs}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenBridge={() => setActiveView('bridge')}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeView === 'dashboard' ? (
            <AccountsDashboardView
              db={db}
              selectedServer={selectedServer}
              onSelectCharacter={handleOpenCharacter}
              onSelectAccount={handleOpenAccount}
              onSelectEmail={handleOpenEmail}
              onSelectClan={handleOpenClan}
              onDeleteAccount={handleDeleteAccount}
              onNavigateAccounts={() => {
                setSelectedEmailFilter(null);
                setActiveView('accounts');
              }}
              onNavigateProfessions={() => setActiveView('professions')}
            />
          ) : activeView === 'bridge' ? (
            <AiBridgeView
              db={db}
              onApplyImport={applyImport}
              onOpenCharacter={handleOpenCharacter}
              onOpenClan={handleOpenClan}
            />
          ) : activeView === 'professions' ? (
            <ProfessionsView
              characters={db.characters}
              selectedServer={selectedServer}
              onSelectCharacter={handleOpenCharacter}
            />
          ) : activeView === 'armors' ? (
            <ArmorSetsView
              db={db}
              selectedServer={selectedServer}
              onSelectCharacter={handleOpenCharacter}
              onSelectClan={handleOpenClan}
              onSetArmorImage={setArmorSetImage}
            />
          ) : activeView === 'epics' ? (
            <EpicJewelsView
              db={db}
              selectedServer={selectedServer}
              onSelectCharacter={handleOpenCharacter}
              onSelectClan={handleOpenClan}
              onSetJewelImage={setArmorSetImage}
            />
          ) : activeView === 'downloads' ? (
            <DownloadsView
              db={db}
              servers={servers}
              selectedServer={selectedServer}
              onOpenBackup={() => setBackupModalOpen(true)}
              onBulkUpsertCatalog={bulkUpsertCatalog}
              onSetIconBaseUrl={setIconBaseUrl}
              onBulkUpsertAccounts={bulkUpsertAccounts}
              onApplyPartialItemsImport={applyPartialItemsImport}
              onRestoreBackup={restoreBackup}
            />
          ) : activeView === 'catalog' ? (
            <ItemCatalogView
              db={db}
              onUpsertCatalogEntry={upsertCatalogEntry}
              onBulkUpsertCatalog={bulkUpsertCatalog}
              onDeleteItemGlobally={deleteItemGlobally}
              onSetIconBaseUrl={setIconBaseUrl}
              onSelectCharacter={handleOpenCharacter}
              onSelectClan={handleOpenClan}
            />
          ) : activeView === 'accounts' ? (
            <AccountsDirectoryView
              db={db}
              servers={servers}
              selectedServer={selectedServer}
              initialEmailFilter={selectedEmailFilter}
              onUpsertAccount={upsertAccount}
              onBulkUpsertAccounts={bulkUpsertAccounts}
              onDeleteAccount={handleDeleteAccount}
              onSelectCharacter={handleOpenCharacter}
              onSelectAccount={handleOpenAccount}
            />
          ) : activeView === 'account' && selectedAccountInfo ? (
            <AccountDetailView
              key={selectedAccountInfo.accountId}
              accountId={selectedAccountInfo.accountId}
              accountMeta={selectedAccountInfo.accountMeta}
              server={selectedAccountInfo.server}
              accountName={selectedAccountInfo.accountName}
              characters={selectedAccountInfo.characters}
              serverClans={db.clans.filter(
                (cl) => cl.server === selectedAccountInfo.server
              )}
              itemCatalog={db.itemCatalog}
              iconBaseUrl={db.iconBaseUrl}
              onQuickEditIcon={setQuickIconItemName}
              onSelectCharacter={handleOpenCharacter}
              onSelectClan={handleOpenClan}
              onSelectEmail={handleOpenEmail}
              onNavigateBridge={() => setActiveView('bridge')}
              onUpsertAccount={upsertAccount}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : activeView === 'character' && selectedCharacter ? (
            <CharacterDetailView
              key={selectedCharacter.id}
              character={selectedCharacter}
              allCharacters={db.characters}
              serverClans={db.clans.filter(
                (cl) => cl.server === selectedCharacter.server
              )}
              itemCatalog={db.itemCatalog}
              iconBaseUrl={db.iconBaseUrl}
              onQuickEditIcon={setQuickIconItemName}
              onAssignSlot={updateItemSlot}
              onAssignClan={assignCharacterClan}
              onSelectClan={handleOpenClan}
              onSelectAccount={handleOpenAccount}
              onUpdateCharacter={(charId, patch, mergeIfExists) => {
                const nextId = updateCharacter(charId, patch, mergeIfExists);
                setSelectedCharacterId(nextId);
              }}
              onDeleteCharacter={(id) => {
                deleteCharacter(id);
                setSelectedCharacterId(null);
                setActiveView('search');
              }}
              onAddItem={addItemEntry}
              onUpdateItem={updateItemEntry}
              onDeleteItem={deleteItemEntry}
              onNavigateBridge={() => setActiveView('bridge')}
            />
          ) : activeView === 'clan' && selectedClan ? (
            <ClanDetailView
              key={selectedClan.id}
              clan={selectedClan}
              serverCharacters={db.characters.filter(
                (c) => c.server === selectedClan.server
              )}
              itemCatalog={db.itemCatalog}
              iconBaseUrl={db.iconBaseUrl}
              onQuickEditIcon={setQuickIconItemName}
              onSelectCharacter={handleOpenCharacter}
              onAssignCharacterClan={assignCharacterClan}
              onUpdateClan={(clanId, patch) => {
                const nextId = updateClan(clanId, patch);
                setSelectedClanId(nextId);
              }}
              onDeleteClan={(id) => {
                deleteClan(id);
                setSelectedClanId(null);
                setActiveView('search');
              }}
              onAddItem={addItemEntry}
              onUpdateItem={updateItemEntry}
              onDeleteItem={deleteItemEntry}
              onNavigateBridge={() => setActiveView('bridge')}
            />
          ) : (
            <GlobalSearchView
              db={db}
              selectedServer={selectedServer}
              onSelectCharacter={handleOpenCharacter}
              onSelectClan={handleOpenClan}
              onNavigateBridge={() => setActiveView('bridge')}
              onUpdateItem={updateItemEntry}
              onQuickEditIcon={setQuickIconItemName}
            />
          )}
        </main>
      </div>

      <QuickIconModal
        itemName={quickIconItemName}
        itemCatalog={db.itemCatalog}
        iconBaseUrl={db.iconBaseUrl}
        characters={db.characters}
        clans={db.clans}
        onClose={() => setQuickIconItemName(null)}
        onSave={upsertCatalogEntry}
        onDeleteItemGlobally={deleteItemGlobally}
      />

      <BackupModal
        open={backupModalOpen}
        db={db}
        onClose={() => setBackupModalOpen(false)}
        onRestoreBackup={restoreBackup}
        onResetToEmpty={resetToEmpty}
        onLoadStarterDemo={loadStarterDemo}
      />
    </div>
  );
}
