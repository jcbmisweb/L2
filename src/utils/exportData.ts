import {L2Database} from '../types/l2';
import {
  LOCATION_LABELS,
  normalizeItemKey,
  resolveItemIconUrl,
} from './storage';

export type CsvSeparator = ';' | ',';

export function downloadBlobFile(
  filename: string,
  content: string,
  mimeType: string,
  withUtf8Bom = false
): void {
  const payload = withUtf8Bom ? `\uFEFF${content}` : content;
  const blob = new Blob([payload], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(
  value: string | number | boolean | null | undefined,
  separator: CsvSeparator
): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (
    str.includes(separator) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  separator: CsvSeparator
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h, separator)).join(separator);
  const bodyLines = rows.map((row) =>
    row.map((cell) => escapeCsvCell(cell, separator)).join(separator)
  );
  return [headerLine, ...bodyLines].join('\r\n');
}

export interface ExportFilterOptions {
  server: string; // 'all' or server name
  account: string; // 'all' or `${server}::${account}`
  includeSecrets: boolean;
  separator: CsvSeparator;
}

export function filterDatabaseForExport(
  db: L2Database,
  options: Pick<ExportFilterOptions, 'server' | 'account' | 'includeSecrets'>
): L2Database {
  const characters = db.characters.filter((c) => {
    if (options.server !== 'all' && c.server !== options.server) return false;
    if (
      options.account !== 'all' &&
      `${c.server}::${c.account}` !== options.account
    ) {
      return false;
    }
    return true;
  });

  const clanKeysNeeded = new Set(
    characters
      .filter((c) => Boolean(c.clan))
      .map((c) => `${c.server}::${c.clan}`)
  );

  const clans = db.clans.filter((cl) => {
    if (options.server !== 'all' && cl.server !== options.server) return false;
    if (options.account !== 'all' && !clanKeysNeeded.has(cl.id)) return false;
    return true;
  });

  const accounts = db.accounts
    .filter((acc) => {
      if (options.server !== 'all' && acc.server !== options.server) return false;
      if (options.account !== 'all' && acc.id !== options.account) return false;
      return true;
    })
    .map((acc) =>
      options.includeSecrets
        ? acc
        : {
            ...acc,
            password: null,
            ssn: null,
          }
    );

  return {
    ...db,
    characters,
    clans,
    accounts,
  };
}

export function exportItemsCsv(
  db: L2Database,
  options: ExportFilterOptions
): {csv: string; rowCount: number} {
  const filtered = filterDatabaseForExport(db, options);
  const headers = [
    'Servidor',
    'Origen',
    'Cuenta',
    'Personaje o Clan',
    'Seccion',
    'Slot',
    'Objeto',
    'Etiquetas',
    'Cantidad',
    'Revisar',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = [];

  filtered.characters.forEach((char) => {
    char.items.forEach((it) => {
      rows.push([
        char.server,
        'Personaje',
        char.account,
        char.character.name,
        LOCATION_LABELS[it.location] || it.location,
        it.slot || '',
        it.name,
        it.tags.join(' | '),
        it.quantity ?? '',
        it.uncertain ? 'Sí' : 'No',
      ]);
    });
  });

  filtered.clans.forEach((clan) => {
    clan.items.forEach((it) => {
      rows.push([
        clan.server,
        'Almacén de clan',
        '',
        clan.name,
        LOCATION_LABELS[it.location] || it.location,
        '',
        it.name,
        it.tags.join(' | '),
        it.quantity ?? '',
        it.uncertain ? 'Sí' : 'No',
      ]);
    });
  });

  return {
    csv: buildCsv(headers, rows, options.separator),
    rowCount: rows.length,
  };
}

export function exportItemsGroupedCsv(
  db: L2Database,
  options: ExportFilterOptions
): {csv: string; rowCount: number} {
  const filtered = filterDatabaseForExport(db, options);
  const map = new Map<
    string,
    {
      name: string;
      totalQty: number;
      hasKnownQty: boolean;
      locations: Set<string>;
      rowsCount: number;
    }
  >();

  const addRow = (ownerLabel: string, locLabel: string, name: string, qty: number | null) => {
    const key = normalizeItemKey(name);
    if (!map.has(key)) {
      map.set(key, {
        name,
        totalQty: 0,
        hasKnownQty: false,
        locations: new Set<string>(),
        rowsCount: 0,
      });
    }
    const entry = map.get(key)!;
    entry.rowsCount += 1;
    entry.locations.add(`${ownerLabel} (${locLabel})`);
    if (typeof qty === 'number' && Number.isFinite(qty)) {
      entry.totalQty += qty;
      entry.hasKnownQty = true;
    }
  };

  filtered.characters.forEach((char) => {
    char.items.forEach((it) => {
      addRow(
        char.character.name,
        LOCATION_LABELS[it.location] || it.location,
        it.name,
        it.quantity
      );
    });
  });

  filtered.clans.forEach((clan) => {
    clan.items.forEach((it) => {
      addRow(`Clan ${clan.name}`, 'Almacén de clan', it.name, it.quantity);
    });
  });

  const sorted = Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const headers = [
    'Objeto',
    'Cantidad total',
    'Filas',
    'Ubicaciones',
    'Icono URL',
  ];

  const rows = sorted.map((entry) => {
    const cat = db.itemCatalog[normalizeItemKey(entry.name)];
    const iconUrl = cat ? resolveItemIconUrl(cat.icon, db.iconBaseUrl) || '' : '';
    return [
      entry.name,
      entry.hasKnownQty ? entry.totalQty : '',
      entry.rowsCount,
      Array.from(entry.locations).join(' | '),
      iconUrl,
    ];
  });

  return {
    csv: buildCsv(headers, rows, options.separator),
    rowCount: rows.length,
  };
}

export function exportCharactersCsv(
  db: L2Database,
  options: ExportFilterOptions
): {csv: string; rowCount: number} {
  const filtered = filterDatabaseForExport(db, options);
  const headers = [
    'Servidor',
    'Cuenta',
    'Personaje',
    'Estado',
    'Raza',
    'Clase',
    'Nivel',
    'Progreso %',
    'HP',
    'MP',
    'SP',
    'Horas',
    'PvP',
    'PK',
    'Karma',
    'Puntos',
    'Noble',
    'Heroe',
    'Online',
    'Clan',
    'Ubicacion',
    'Subclase 1',
    'Subclase 2',
    'Subclase 3',
    'Creacion',
    'Ultimo acceso',
    'Desconexion',
    'Adena',
    'Filas de items',
  ];

  const rows = filtered.characters.map((c) => {
    const st = c.character;
    const subs = st.subclasses || [];
    const formatSub = (idx: number) => {
      const sub = subs[idx];
      if (!sub) return '';
      return `${sub.class || '?'} Nv.${sub.level ?? '?'}`;
    };
    const adena = c.items.reduce((sum, it) => {
      if (
        it.name.trim().toLowerCase() === 'adena' &&
        typeof it.quantity === 'number'
      ) {
        return sum + it.quantity;
      }
      return sum;
    }, 0);

    return [
      c.server,
      c.account,
      st.name,
      c.status === 'captured' ? 'Capturado' : 'Pendiente',
      st.race || '',
      st.class || '',
      st.level ?? '',
      st.level_progress_pct ?? '',
      st.hp ?? '',
      st.mp ?? '',
      st.sp ?? '',
      st.hours_played ?? '',
      st.pvp ?? '',
      st.pk ?? '',
      st.karma ?? '',
      st.points ?? '',
      st.noble === true ? 'Sí' : st.noble === false ? 'No' : '',
      st.hero === true ? 'Sí' : st.hero === false ? 'No' : '',
      st.online === true ? 'Sí' : st.online === false ? 'No' : '',
      c.clan || '',
      st.location || '',
      formatSub(0),
      formatSub(1),
      formatSub(2),
      st.creation_date || '',
      st.last_access || '',
      st.last_disconnect || '',
      adena,
      c.items.length,
    ];
  });

  return {
    csv: buildCsv(headers, rows, options.separator),
    rowCount: rows.length,
  };
}

export function exportAccountsCsv(
  db: L2Database,
  options: ExportFilterOptions
): {csv: string; rowCount: number} {
  const filtered = filterDatabaseForExport(db, options);

  // Merge accounts + any characters whose account isn't in db.accounts yet
  const accMap = new Map<
    string,
    {
      server: string;
      account: string;
      email: string;
      password: string;
      ssn: string;
      notes: string;
      lastAccess: string;
      characters: string[];
    }
  >();

  filtered.accounts.forEach((acc) => {
    accMap.set(acc.id, {
      server: acc.server,
      account: acc.account,
      email: acc.email || '',
      password: options.includeSecrets ? acc.password || '' : acc.password ? '[OCULTA]' : '',
      ssn: options.includeSecrets ? acc.ssn || '' : acc.ssn ? '[OCULTO]' : '',
      notes: acc.notes || '',
      lastAccess: acc.lastAccess || '',
      characters: [],
    });
  });

  filtered.characters.forEach((char) => {
    const id = `${char.server}::${char.account}`;
    if (!accMap.has(id)) {
      accMap.set(id, {
        server: char.server,
        account: char.account,
        email: '',
        password: '',
        ssn: '',
        notes: '',
        lastAccess: char.character.last_access || '',
        characters: [],
      });
    }
    accMap.get(id)!.characters.push(char.character.name);
  });

  const headers = [
    'Servidor',
    'Cuenta',
    'Correo',
    'Contraseña',
    'SSN',
    'Personajes',
    'Ultimo acceso',
    'Notas',
  ];

  const rows = Array.from(accMap.values())
    .sort((a, b) => a.account.localeCompare(b.account, undefined, {numeric: true}))
    .map((a) => [
      a.server,
      a.account,
      a.email,
      a.password,
      a.ssn,
      a.characters.join(' | '),
      a.lastAccess,
      a.notes,
    ]);

  return {
    csv: buildCsv(headers, rows, options.separator),
    rowCount: rows.length,
  };
}

export function exportClansCsv(
  db: L2Database,
  options: ExportFilterOptions
): {csv: string; rowCount: number} {
  const filtered = filterDatabaseForExport(db, options);
  const headers = [
    'Servidor',
    'Clan',
    'Miembros vinculados',
    'Objeto',
    'Etiquetas',
    'Cantidad',
    'Revisar',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = [];

  filtered.clans.forEach((clan) => {
    const members = db.characters
      .filter((c) => c.server === clan.server && c.clan === clan.name)
      .map((c) => c.character.name)
      .join(' | ');

    if (clan.items.length === 0) {
      rows.push([clan.server, clan.name, members, '(Sin objetos)', '', 0, 'No']);
    } else {
      clan.items.forEach((it) => {
        rows.push([
          clan.server,
          clan.name,
          members,
          it.name,
          it.tags.join(' | '),
          it.quantity ?? '',
          it.uncertain ? 'Sí' : 'No',
        ]);
      });
    }
  });

  return {
    csv: buildCsv(headers, rows, options.separator),
    rowCount: rows.length,
  };
}

export function exportCatalogCsv(
  db: L2Database,
  separator: CsvSeparator
): {csv: string; rowCount: number} {
  const entries = Object.values(db.itemCatalog || {}).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const headers = ['Objeto', 'Archivo o ruta de icono', 'URL completa', 'Actualizado'];
  const rows = entries.map((e) => [
    e.name,
    e.icon,
    resolveItemIconUrl(e.icon, db.iconBaseUrl) || '',
    e.updatedAt,
  ]);
  return {
    csv: buildCsv(headers, rows, separator),
    rowCount: rows.length,
  };
}
