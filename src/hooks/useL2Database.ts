import {useCallback, useEffect, useMemo, useState} from 'react';
import {createEmptyDatabase, createStarterDatabase} from '../data/starterData';
import {
  AccountMeta,
  CharacterRecord,
  CharacterStats,
  ClanRecord,
  EquipmentSlot,
  ImportMergeMode,
  ItemCatalogEntry,
  ItemEntry,
  ItemLocation,
  L2Database,
  ParsedPayloadPreview,
} from '../types/l2';
import {
  applyImportPreviews,
  makeAccountId,
  makeCharacterId,
  makeClanId,
} from '../utils/jsonParser';
import {
  DEFAULT_ICON_BASE_URL,
  loadDatabase,
  normalizeIconInput,
  normalizeItemKey,
  saveDatabase,
} from '../utils/storage';

export function useL2Database() {
  const [db, setDb] = useState<L2Database>(() => loadDatabase());

  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  const servers = useMemo(() => {
    const set = new Set<string>();
    db.accounts.forEach((a) => set.add(a.server));
    db.characters.forEach((c) => set.add(c.server));
    db.clans.forEach((cl) => set.add(cl.server));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [db]);

  const applyImport = useCallback(
    (previews: ParsedPayloadPreview[], mergeMode: ImportMergeMode) => {
      setDb((prev) => applyImportPreviews(prev, previews, mergeMode));
    },
    []
  );

  const assignCharacterClan = useCallback(
    (characterId: string, clanName: string | null) => {
      setDb((prev) => {
        const now = new Date().toISOString();
        const targetChar = prev.characters.find((c) => c.id === characterId);
        if (!targetChar) return prev;

        const cleanClan = clanName && clanName.trim() ? clanName.trim() : null;
        const characters = prev.characters.map((c) =>
          c.id === characterId ? {...c, clan: cleanClan, updatedAt: now} : c
        );

        let clans = [...prev.clans];
        if (cleanClan) {
          const clanId = makeClanId(targetChar.server, cleanClan);
          if (!clans.some((cl) => cl.id === clanId)) {
            clans.push({
              id: clanId,
              server: targetChar.server,
              name: cleanClan,
              items: [],
              updatedAt: now,
            });
          }
        }

        return {
          ...prev,
          characters,
          clans,
          updatedAt: now,
        };
      });
    },
    []
  );

  const createClan = useCallback((server: string, clanName: string): ClanRecord | null => {
    const cleanServer = server.trim();
    const cleanName = clanName.trim();
    if (!cleanServer || !cleanName) return null;

    const clanId = makeClanId(cleanServer, cleanName);
    const now = new Date().toISOString();
    const created: ClanRecord = {
      id: clanId,
      server: cleanServer,
      name: cleanName,
      items: [],
      updatedAt: now,
    };

    setDb((prev) => {
      if (prev.clans.some((c) => c.id === clanId)) return prev;
      return {
        ...prev,
        clans: [...prev.clans, created],
        updatedAt: now,
      };
    });

    return created;
  }, []);

  const deleteCharacter = useCallback((characterId: string) => {
    setDb((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== characterId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteClan = useCallback((clanId: string) => {
    setDb((prev) => {
      const target = prev.clans.find((cl) => cl.id === clanId);
      if (!target) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        clans: prev.clans.filter((cl) => cl.id !== clanId),
        characters: prev.characters.map((c) =>
          c.server === target.server && c.clan === target.name
            ? {...c, clan: null, updatedAt: now}
            : c
        ),
        updatedAt: now,
      };
    });
  }, []);

  const updateCharacter = useCallback(
    (
      characterId: string,
      patch: {
        server?: string;
        account?: string;
        clan?: string | null;
        status?: 'captured' | 'pending';
        character?: Partial<CharacterStats>;
      },
      mergeIfExists = false
    ): string => {
      const target = db.characters.find((c) => c.id === characterId);
      if (!target) return characterId;

      const nextServer = (patch.server ?? target.server).trim() || target.server;
      const nextAccount =
        (patch.account ?? target.account).trim() || target.account;
      const nextName =
        (patch.character?.name ?? target.character.name).trim() ||
        target.character.name;
      const nextId = makeCharacterId(nextServer, nextAccount, nextName);

      setDb((prev) => {
        const now = new Date().toISOString();
        const current = prev.characters.find((c) => c.id === characterId);
        if (!current) return prev;

        const cleanClan =
          patch.clan !== undefined
            ? patch.clan && patch.clan.trim()
              ? patch.clan.trim()
              : null
            : current.clan;

        const updatedChar: CharacterRecord = {
          ...current,
          id: nextId,
          server: nextServer,
          account: nextAccount,
          clan: cleanClan,
          status: patch.status ?? current.status,
          updatedAt: now,
          character: {
            ...current.character,
            ...(patch.character || {}),
            name: nextName,
          },
        };

        const conflict =
          nextId !== characterId
            ? prev.characters.find((c) => c.id === nextId)
            : undefined;

        if (conflict && !mergeIfExists && conflict.status === 'captured') {
          return prev;
        }

        const nextCharacters = prev.characters
          .filter((c) => c.id !== characterId && c.id !== nextId)
          .concat(updatedChar);

        let nextAccounts = [...prev.accounts];
        const accId = makeAccountId(nextServer, nextAccount);
        if (!nextAccounts.some((a) => a.id === accId)) {
          nextAccounts.push({
            id: accId,
            server: nextServer,
            account: nextAccount,
            lastAccess: updatedChar.character.last_access ?? null,
          });
        }

        let nextClans = [...prev.clans];
        if (cleanClan) {
          const clanId = makeClanId(nextServer, cleanClan);
          if (!nextClans.some((cl) => cl.id === clanId)) {
            nextClans.push({
              id: clanId,
              server: nextServer,
              name: cleanClan,
              items: [],
              updatedAt: now,
            });
          }
        }

        return {
          ...prev,
          characters: nextCharacters,
          accounts: nextAccounts,
          clans: nextClans,
          updatedAt: now,
        };
      });

      return nextId;
    },
    [db.characters]
  );

  const updateClan = useCallback(
    (
      clanId: string,
      patch: {name?: string; server?: string}
    ): string => {
      const target = db.clans.find((cl) => cl.id === clanId);
      if (!target) return clanId;

      const nextServer = (patch.server ?? target.server).trim() || target.server;
      const nextName = (patch.name ?? target.name).trim() || target.name;
      const nextId = makeClanId(nextServer, nextName);

      setDb((prev) => {
        const now = new Date().toISOString();
        const current = prev.clans.find((cl) => cl.id === clanId);
        if (!current) return prev;

        const existingTarget =
          nextId !== clanId ? prev.clans.find((cl) => cl.id === nextId) : undefined;

        const mergedItems = existingTarget
          ? [...existingTarget.items, ...current.items]
          : current.items;

        const nextClan: ClanRecord = {
          ...current,
          id: nextId,
          server: nextServer,
          name: nextName,
          items: mergedItems,
          updatedAt: now,
        };

        const nextClans = prev.clans
          .filter((cl) => cl.id !== clanId && cl.id !== nextId)
          .concat(nextClan);

        const nextCharacters = prev.characters.map((c) => {
          if (c.server === current.server && c.clan === current.name) {
            return {
              ...c,
              clan: nextName,
              updatedAt: now,
            };
          }
          return c;
        });

        return {
          ...prev,
          clans: nextClans,
          characters: nextCharacters,
          updatedAt: now,
        };
      });

      return nextId;
    },
    [db.clans]
  );

  const addItemEntry = useCallback(
    (
      ownerType: 'character' | 'clan',
      ownerId: string,
      item: {
        name: string;
        quantity: number | null;
        location: ItemLocation;
        tags: string[];
        slot?: EquipmentSlot | null;
      }
    ) => {
      const cleanName = item.name.trim();
      if (!cleanName) return;
      const newEntry: ItemEntry = {
        id: `item-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        name: cleanName,
        quantity: item.quantity,
        location: ownerType === 'clan' ? 'clan_warehouse' : item.location,
        slot: item.slot ?? null,
        tags: item.tags.map((t) => t.trim()).filter(Boolean),
        uncertain: false,
      };

      setDb((prev) => {
        const now = new Date().toISOString();
        if (ownerType === 'character') {
          return {
            ...prev,
            characters: prev.characters.map((char) =>
              char.id === ownerId
                ? {...char, items: [newEntry, ...char.items], updatedAt: now}
                : char
            ),
            updatedAt: now,
          };
        }
        return {
          ...prev,
          clans: prev.clans.map((clan) =>
            clan.id === ownerId
              ? {...clan, items: [newEntry, ...clan.items], updatedAt: now}
              : clan
          ),
          updatedAt: now,
        };
      });
    },
    []
  );

  const deleteItemEntry = useCallback(
    (ownerType: 'character' | 'clan', ownerId: string, itemId: string) => {
      setDb((prev) => {
        const now = new Date().toISOString();
        if (ownerType === 'character') {
          return {
            ...prev,
            characters: prev.characters.map((char) =>
              char.id === ownerId
                ? {
                    ...char,
                    items: char.items.filter((i) => i.id !== itemId),
                    updatedAt: now,
                  }
                : char
            ),
            updatedAt: now,
          };
        }
        return {
          ...prev,
          clans: prev.clans.map((clan) =>
            clan.id === ownerId
              ? {
                  ...clan,
                  items: clan.items.filter((i) => i.id !== itemId),
                  updatedAt: now,
                }
              : clan
          ),
          updatedAt: now,
        };
      });
    },
    []
  );

  const updateItemEntry = useCallback(
    (
      ownerType: 'character' | 'clan',
      ownerId: string,
      itemId: string,
      patch: {
        name?: string;
        quantity?: number | null;
        uncertain?: boolean;
        location?: ItemLocation;
        tags?: string[];
        slot?: EquipmentSlot | null;
      }
    ) => {
      setDb((prev) => {
        const now = new Date().toISOString();
        if (ownerType === 'character') {
          return {
            ...prev,
            characters: prev.characters.map((char) => {
              if (char.id !== ownerId) return char;
              return {
                ...char,
                updatedAt: now,
                items: char.items.map((item) =>
                  item.id === itemId ? {...item, ...patch} : item
                ),
              };
            }),
            updatedAt: now,
          };
        }

        return {
          ...prev,
          clans: prev.clans.map((clan) => {
            if (clan.id !== ownerId) return clan;
            return {
              ...clan,
              updatedAt: now,
              items: clan.items.map((item) =>
                item.id === itemId ? {...item, ...patch} : item
              ),
            };
          }),
          updatedAt: now,
        };
      });
    },
    []
  );

  const updateItemSlot = useCallback(
    (characterId: string, itemId: string | null, slot: EquipmentSlot) => {
      setDb((prev) => {
        const now = new Date().toISOString();
        return {
          ...prev,
          characters: prev.characters.map((char) => {
            if (char.id !== characterId) return char;
            return {
              ...char,
              updatedAt: now,
              items: char.items.map((item) => {
                if (item.location !== 'equipped') return item;
                if (item.id === itemId) {
                  return {...item, slot};
                }
                if (item.slot === slot) {
                  return {...item, slot: null};
                }
                return item;
              }),
            };
          }),
          updatedAt: now,
        };
      });
    },
    []
  );

  const upsertCatalogEntry = useCallback((name: string, rawIcon: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const key = normalizeItemKey(cleanName);

    setDb((prev) => {
      const now = new Date().toISOString();
      const baseUrl = prev.iconBaseUrl || DEFAULT_ICON_BASE_URL;
      const icon = normalizeIconInput(rawIcon, baseUrl);
      const nextCatalog = {...(prev.itemCatalog || {})};

      if (!icon) {
        delete nextCatalog[key];
      } else {
        nextCatalog[key] = {
          key,
          name: cleanName,
          icon,
          updatedAt: now,
        };
      }

      return {
        ...prev,
        itemCatalog: nextCatalog,
        updatedAt: now,
      };
    });
  }, []);

  const bulkUpsertCatalog = useCallback(
    (entries: {name: string; icon: string}[]) => {
      if (entries.length === 0) return;
      setDb((prev) => {
        const now = new Date().toISOString();
        const baseUrl = prev.iconBaseUrl || DEFAULT_ICON_BASE_URL;
        const nextCatalog = {...(prev.itemCatalog || {})};

        entries.forEach(({name, icon}) => {
          const cleanName = name.trim();
          const normalizedIcon = normalizeIconInput(icon, baseUrl);
          if (!cleanName || !normalizedIcon) return;
          const key = normalizeItemKey(cleanName);
          nextCatalog[key] = {
            key,
            name: cleanName,
            icon: normalizedIcon,
            updatedAt: now,
          };
        });

        return {
          ...prev,
          itemCatalog: nextCatalog,
          updatedAt: now,
        };
      });
    },
    []
  );

  const setIconBaseUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    setDb((prev) => ({
      ...prev,
      iconBaseUrl: trimmed || DEFAULT_ICON_BASE_URL,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const upsertAccount = useCallback(
    (input: {
      server: string;
      account: string;
      email?: string | null;
      password?: string | null;
      ssn?: string | null;
      notes?: string | null;
      originalId?: string;
    }) => {
      const server = input.server.trim();
      const account = input.account.trim();
      if (!server || !account) return;

      const id = makeAccountId(server, account);
      const now = new Date().toISOString();

      setDb((prev) => {
        const filtered = input.originalId && input.originalId !== id
          ? prev.accounts.filter((a) => a.id !== input.originalId)
          : prev.accounts;

        const existing = filtered.find((a) => a.id === id);
        const nextEntry: AccountMeta = {
          ...(existing || {id, server, account}),
          id,
          server,
          account,
          email: input.email?.trim() ? input.email.trim() : null,
          password: input.password?.trim() ? input.password.trim() : null,
          ssn: input.ssn?.trim() ? input.ssn.trim() : null,
          notes: input.notes?.trim() ? input.notes.trim() : null,
        };

        const existsIdx = filtered.findIndex((a) => a.id === id);
        const nextAccounts =
          existsIdx === -1
            ? [...filtered, nextEntry]
            : filtered.map((a, idx) => (idx === existsIdx ? nextEntry : a));

        return {
          ...prev,
          accounts: nextAccounts,
          updatedAt: now,
        };
      });
    },
    []
  );

  const bulkUpsertAccounts = useCallback(
    (
      entries: {
        server: string;
        account: string;
        email?: string | null;
        password?: string | null;
        ssn?: string | null;
      }[]
    ) => {
      if (entries.length === 0) return;
      const now = new Date().toISOString();

      setDb((prev) => {
        const map = new Map<string, AccountMeta>();
        prev.accounts.forEach((a) => map.set(a.id, a));

        entries.forEach((entry) => {
          const server = entry.server.trim();
          const account = entry.account.trim();
          if (!server || !account) return;
          const id = makeAccountId(server, account);
          const existing = map.get(id);

          map.set(id, {
            ...(existing || {id, server, account}),
            id,
            server,
            account,
            email: entry.email?.trim()
              ? entry.email.trim()
              : existing?.email ?? null,
            password: entry.password?.trim()
              ? entry.password.trim()
              : existing?.password ?? null,
            ssn: entry.ssn?.trim() ? entry.ssn.trim() : existing?.ssn ?? null,
          });
        });

        return {
          ...prev,
          accounts: Array.from(map.values()),
          updatedAt: now,
        };
      });
    },
    []
  );

  const deleteAccount = useCallback((accountId: string) => {
    setDb((prev) => {
      const target = prev.accounts.find((a) => a.id === accountId);
      if (!target) return prev;
      const hasChars = prev.characters.some(
        (c) => c.server === target.server && c.account === target.account
      );

      // If characters exist under this account, clear only credentials so inventories are never orphaned
      const accounts = hasChars
        ? prev.accounts.map((a) =>
            a.id === accountId
              ? {...a, email: null, password: null, ssn: null, notes: null}
              : a
          )
        : prev.accounts.filter((a) => a.id !== accountId);

      return {
        ...prev,
        accounts,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const restoreBackup = useCallback(
    (incoming: L2Database, mode: 'replace' | 'merge') => {
      if (mode === 'replace') {
        setDb({
          version: 1,
          characters: incoming.characters || [],
          clans: incoming.clans || [],
          accounts: incoming.accounts || [],
          iconBaseUrl: incoming.iconBaseUrl || DEFAULT_ICON_BASE_URL,
          itemCatalog: incoming.itemCatalog || {},
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      setDb((prev) => {
        const charMap = new Map<string, CharacterRecord>();
        prev.characters.forEach((c) => charMap.set(c.id, c));
        (incoming.characters || []).forEach((c) => charMap.set(c.id, c));

        const clanMap = new Map<string, ClanRecord>();
        prev.clans.forEach((cl) => clanMap.set(cl.id, cl));
        (incoming.clans || []).forEach((cl) => clanMap.set(cl.id, cl));

        const accMap = new Map(prev.accounts.map((a) => [a.id, a]));
        (incoming.accounts || []).forEach((a) => accMap.set(a.id, a));

        const mergedCatalog: Record<string, ItemCatalogEntry> = {
          ...(prev.itemCatalog || {}),
          ...(incoming.itemCatalog || {}),
        };

        return {
          version: 1,
          characters: Array.from(charMap.values()),
          clans: Array.from(clanMap.values()),
          accounts: Array.from(accMap.values()),
          iconBaseUrl:
            incoming.iconBaseUrl || prev.iconBaseUrl || DEFAULT_ICON_BASE_URL,
          itemCatalog: mergedCatalog,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    []
  );

  const resetToEmpty = useCallback(() => {
    setDb(createEmptyDatabase());
  }, []);

  const loadStarterDemo = useCallback(() => {
    setDb(createStarterDatabase());
  }, []);

  return {
    db,
    servers,
    applyImport,
    assignCharacterClan,
    createClan,
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
    setIconBaseUrl,
    upsertAccount,
    bulkUpsertAccounts,
    deleteAccount,
    restoreBackup,
    resetToEmpty,
    loadStarterDemo,
  };
}
