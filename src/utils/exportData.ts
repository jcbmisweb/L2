import {
  EquipmentSlot,
  ItemEntry,
  ItemLocation,
  L2Database,
} from '../types/l2';
import {
  LOCATION_LABELS,
  normalizeItemKey,
  resolveItemIconUrl,
  stripItemEnchantPrefix,
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
    const baseName = stripItemEnchantPrefix(name);
    const key = normalizeItemKey(baseName);
    if (!map.has(key)) {
      map.set(key, {
        name: baseName,
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
  const ownersByKey = new Map<string, Set<string>>();

  db.characters.forEach((char) => {
    char.items.forEach((it) => {
      const k = normalizeItemKey(it.name);
      if (!ownersByKey.has(k)) ownersByKey.set(k, new Set());
      const loc = LOCATION_LABELS[it.location] || it.location;
      ownersByKey.get(k)!.add(`${char.character.name} (${loc})`);
    });
  });

  db.clans.forEach((clan) => {
    clan.items.forEach((it) => {
      const k = normalizeItemKey(it.name);
      if (!ownersByKey.has(k)) ownersByKey.set(k, new Set());
      ownersByKey.get(k)!.add(`Clan ${clan.name}`);
    });
  });

  const entries = Object.values(db.itemCatalog || {}).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const headers = [
    'Objeto',
    'Archivo o ruta de icono',
    'URL completa',
    'Actualizado',
    'Personajes y ubicaciones',
  ];
  const rows = entries.map((e) => {
    const owners = Array.from(ownersByKey.get(normalizeItemKey(e.name)) || []);
    return [
      stripItemEnchantPrefix(e.name),
      e.icon,
      resolveItemIconUrl(e.icon, db.iconBaseUrl) || '',
      e.updatedAt,
      owners.slice(0, 6).join(' | ') +
        (owners.length > 6 ? ` (+${owners.length - 6})` : ''),
    ];
  });
  return {
    csv: buildCsv(headers, rows, separator),
    rowCount: rows.length,
  };
}

/* ========================== PARTIAL FILE PARSERS ========================== */

function detectCsvSeparator(cleanText: string): CsvSeparator {
  const firstLine = cleanText.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  let semicolons = 0;
  let commas = 0;
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ';') semicolons++;
      if (ch === ',') commas++;
    }
  }
  return semicolons >= commas ? ';' : ',';
}

export function parseCsvText(rawText: string): {
  rows: string[][];
  separator: CsvSeparator;
} {
  const text = rawText.replace(/^\uFEFF/, '');
  const separator = detectCsvSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === separator) {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return {rows, separator};
}

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseCatalogFileContent(rawText: string): {
  entries: {name: string; icon: string}[];
  iconBaseUrl?: string;
  error?: string;
} {
  const clean = rawText.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return {entries: [], error: 'El archivo está vacío.'};
  }

  // 1. JSON format (supports exported catalog JSON, full DB JSON, array, or map)
  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const parsed = JSON.parse(clean) as unknown;
      const entries: {name: string; icon: string}[] = [];
      let iconBaseUrl: string | undefined;

      const pushIfValid = (name: unknown, icon: unknown) => {
        if (typeof name !== 'string' || typeof icon !== 'string') return;
        const n = name.trim();
        const ic = icon.trim();
        if (n && ic) entries.push({name: n, icon: ic});
      };

      if (Array.isArray(parsed)) {
        parsed.forEach((row) => {
          if (!row || typeof row !== 'object') return;
          const rec = row as Record<string, unknown>;
          pushIfValid(
            rec.name ?? rec.objeto ?? rec.item,
            rec.icon ?? rec.url ?? rec.image ?? rec.img
          );
        });
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.iconBaseUrl === 'string' && obj.iconBaseUrl.trim()) {
          iconBaseUrl = obj.iconBaseUrl.trim();
        }
        const catalogSource =
          obj.itemCatalog && typeof obj.itemCatalog === 'object'
            ? (obj.itemCatalog as Record<string, unknown>)
            : obj;

        Object.entries(catalogSource).forEach(([key, val]) => {
          if (key === 'iconBaseUrl' || key === 'version' || key === 'updatedAt') return;
          if (typeof val === 'string') {
            pushIfValid(key, val);
          } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            const rec = val as Record<string, unknown>;
            pushIfValid(
              typeof rec.name === 'string' ? rec.name : key,
              rec.icon ?? rec.url ?? rec.image
            );
          }
        });
      }

      if (entries.length === 0) {
        return {
          entries: [],
          iconBaseUrl,
          error: 'El archivo JSON no contiene ítems con icono válidos.',
        };
      }
      return {entries, iconBaseUrl};
    } catch {
      return {
        entries: [],
        error: 'No se pudo leer el archivo JSON de catálogo. Verifica la sintaxis.',
      };
    }
  }

  // 2. CSV / Text format
  const {rows} = parseCsvText(clean);
  if (rows.length === 0) {
    return {entries: [], error: 'No se encontraron filas válidas en el archivo.'};
  }

  const firstHeaders = rows[0].map(normHeader);
  const looksLikeHeader =
    firstHeaders.some((h) => h === 'objeto' || h === 'item' || h === 'name' || h === 'nombre') &&
    firstHeaders.some(
      (h) =>
        h.includes('icono') ||
        h.includes('icon') ||
        h.includes('archivo') ||
        h.includes('url') ||
        h.includes('imagen')
    );

  const entries: {name: string; icon: string}[] = [];

  if (looksLikeHeader) {
    const nameIdx = firstHeaders.findIndex(
      (h) => h === 'objeto' || h === 'name' || h === 'item' || h === 'nombre'
    );
    const relIconIdx = firstHeaders.findIndex(
      (h) => h.includes('archivo') || h === 'icono' || h === 'icon'
    );
    const urlIdx = firstHeaders.findIndex((h) => h.includes('url'));

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const name = (nameIdx >= 0 ? cells[nameIdx] : cells[0])?.trim() || '';
      const relIcon = relIconIdx >= 0 ? cells[relIconIdx]?.trim() || '' : '';
      const fullUrl = urlIdx >= 0 ? cells[urlIdx]?.trim() || '' : '';
      const fallbackSecond = cells[1]?.trim() || '';
      const icon = relIcon || fullUrl || (relIconIdx < 0 && urlIdx < 0 ? fallbackSecond : '');
      if (name && icon) {
        entries.push({name, icon});
      }
    }
  } else {
    rows.forEach((cells) => {
      if (cells.length >= 2) {
        const name = cells[0]?.trim();
        const icon = cells[1]?.trim() || cells[2]?.trim() || '';
        if (name && icon) entries.push({name, icon});
      } else if (cells.length === 1 && cells[0].includes('=')) {
        const eqIdx = cells[0].indexOf('=');
        const name = cells[0].slice(0, eqIdx).trim();
        const icon = cells[0].slice(eqIdx + 1).trim();
        if (name && icon) entries.push({name, icon});
      }
    });
  }

  if (entries.length === 0) {
    return {
      entries: [],
      error:
        'No se encontraron filas con nombre de objeto e icono. Usa el formato CSV/JSON descargado desde aquí.',
    };
  }

  return {entries};
}

export function parseAccountsFileContent(
  rawText: string,
  defaultServer: string
): {
  entries: {
    server: string;
    account: string;
    email?: string | null;
    password?: string | null;
    ssn?: string | null;
    notes?: string | null;
    lastAccess?: string | null;
  }[];
  error?: string;
} {
  const clean = rawText.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return {entries: [], error: 'El archivo está vacío.'};
  }

  const sanitizeSecret = (val: string | null | undefined): string | undefined => {
    if (!val) return undefined;
    const t = val.trim();
    if (!t || t === '[OCULTA]' || t === '[OCULTO]') return undefined;
    return t;
  };

  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const parsed = JSON.parse(clean) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as Record<string, unknown>).accounts)
        ? ((parsed as Record<string, unknown>).accounts as unknown[])
        : null;

      if (!list) {
        return {entries: [], error: 'JSON de cuentas no válido.'};
      }

      const entries: {
        server: string;
        account: string;
        email?: string | null;
        password?: string | null;
        ssn?: string | null;
        notes?: string | null;
        lastAccess?: string | null;
      }[] = [];

      list.forEach((raw) => {
        if (!raw || typeof raw !== 'object') return;
        const r = raw as Record<string, unknown>;
        const account = typeof r.account === 'string' ? r.account.trim() : '';
        const server =
          typeof r.server === 'string' && r.server.trim()
            ? r.server.trim()
            : defaultServer;
        if (!account) return;
        entries.push({
          server,
          account,
          email: typeof r.email === 'string' ? r.email.trim() || undefined : undefined,
          password: sanitizeSecret(typeof r.password === 'string' ? r.password : undefined),
          ssn: sanitizeSecret(typeof r.ssn === 'string' ? r.ssn : undefined),
          notes: typeof r.notes === 'string' ? r.notes.trim() || undefined : undefined,
          lastAccess:
            typeof r.lastAccess === 'string' ? r.lastAccess.trim() || undefined : undefined,
        });
      });

      if (entries.length === 0) {
        return {entries: [], error: 'No se encontraron cuentas válidas en el JSON.'};
      }
      return {entries};
    } catch {
      return {entries: [], error: 'No se pudo leer el JSON de cuentas.'};
    }
  }

  const {rows} = parseCsvText(clean);
  if (rows.length === 0) {
    return {entries: [], error: 'No se encontraron filas en el archivo CSV.'};
  }

  const firstHeaders = rows[0].map(normHeader);
  const hasHeader =
    firstHeaders.includes('cuenta') ||
    firstHeaders.includes('account') ||
    firstHeaders.includes('correo') ||
    firstHeaders.includes('servidor');

  const entries: {
    server: string;
    account: string;
    email?: string | null;
    password?: string | null;
    ssn?: string | null;
    notes?: string | null;
    lastAccess?: string | null;
  }[] = [];

  if (hasHeader) {
    const idxServer = firstHeaders.findIndex((h) => h === 'servidor' || h === 'server');
    const idxAccount = firstHeaders.findIndex((h) => h === 'cuenta' || h === 'account');
    const idxEmail = firstHeaders.findIndex(
      (h) => h === 'correo' || h === 'email' || h === 'mail'
    );
    const idxPass = firstHeaders.findIndex(
      (h) => h === 'contrasena' || h === 'password' || h === 'clave'
    );
    const idxSsn = firstHeaders.findIndex((h) => h === 'ssn');
    const idxLastAccess = firstHeaders.findIndex(
      (h) => h === 'ultimo acceso' || h === 'lastaccess' || h === 'last_access'
    );
    const idxNotes = firstHeaders.findIndex((h) => h === 'notas' || h === 'notes');

    for (let r = 1; r < rows.length; r++) {
      const c = rows[r];
      const account = (idxAccount >= 0 ? c[idxAccount] : c[1])?.trim() || '';
      if (!account) continue;
      const server =
        (idxServer >= 0 ? c[idxServer] : '')?.trim() || defaultServer;
      entries.push({
        server,
        account,
        email: idxEmail >= 0 ? c[idxEmail]?.trim() || undefined : undefined,
        password: sanitizeSecret(idxPass >= 0 ? c[idxPass] : undefined),
        ssn: sanitizeSecret(idxSsn >= 0 ? c[idxSsn] : undefined),
        lastAccess:
          idxLastAccess >= 0 ? c[idxLastAccess]?.trim() || undefined : undefined,
        notes: idxNotes >= 0 ? c[idxNotes]?.trim() || undefined : undefined,
      });
    }
  } else {
    rows.forEach((c) => {
      const account = c[0]?.trim();
      if (!account) return;
      entries.push({
        server: defaultServer,
        account,
        password: sanitizeSecret(c[1]),
        email: c[2]?.trim() || undefined,
        ssn: sanitizeSecret(c[3]),
        notes: c[4]?.trim() || undefined,
      });
    });
  }

  if (entries.length === 0) {
    return {entries: [], error: 'No se encontraron cuentas válidas para importar.'};
  }

  return {entries};
}

const VALID_SLOTS = new Set<EquipmentSlot>([
  'hair_1',
  'helmet',
  'hair_2',
  'gloves',
  'chest',
  'boots',
  'cloak',
  'legs',
  'belt',
  'rhand',
  'lhand',
  'earring_1',
  'earring_2',
  'shirt',
  'ring_1',
  'ring_2',
  'necklace',
]);

function mapCsvLocation(raw: string): ItemLocation {
  const n = normHeader(raw);
  if (n.includes('equip')) return 'equipped';
  if (n.includes('invent')) return 'inventory';
  if (n.includes('clan')) return 'clan_warehouse';
  if (n.includes('almac') || n.includes('ware')) return 'warehouse';
  if (n.includes('corr') || n.includes('mail')) return 'mail';
  if (n.includes('masc') || n.includes('pet')) return 'pets';
  if (n.includes('mis') || n.includes('quest')) return 'quests';
  return 'inventory';
}

function parseCsvQuantity(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digitsOnly = trimmed.replace(/[.,\s]/g, '');
  if (!/^-?\d+$/.test(digitsOnly)) return null;
  const num = Number(digitsOnly);
  return Number.isFinite(num) ? num : null;
}

export interface PartialItemsCharacterBatch {
  server: string;
  account: string;
  name: string;
  items: Omit<ItemEntry, 'id'>[];
}

export interface PartialItemsClanBatch {
  server: string;
  name: string;
  items: Omit<ItemEntry, 'id'>[];
}

export function parseItemsFileContent(
  rawText: string,
  defaultServer: string
): {
  characterBatches: PartialItemsCharacterBatch[];
  clanBatches: PartialItemsClanBatch[];
  error?: string;
} {
  const clean = rawText.replace(/^\uFEFF/, '').trim();
  if (!clean) {
    return {characterBatches: [], clanBatches: [], error: 'El archivo está vacío.'};
  }

  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const parsed = JSON.parse(clean) as Record<string, unknown>;
      const charBatches: PartialItemsCharacterBatch[] = [];
      const clanBatches: PartialItemsClanBatch[] = [];

      if (Array.isArray(parsed.characters)) {
        parsed.characters.forEach((raw) => {
          if (!raw || typeof raw !== 'object') return;
          const c = raw as Record<string, unknown>;
          const charInfo = (c.character || {}) as Record<string, unknown>;
          const name =
            typeof charInfo.name === 'string'
              ? charInfo.name.trim()
              : typeof c.name === 'string'
              ? c.name.trim()
              : '';
          if (!name) return;
          const server =
            typeof c.server === 'string' && c.server.trim()
              ? c.server.trim()
              : defaultServer;
          const account =
            typeof c.account === 'string' && c.account.trim()
              ? c.account.trim()
              : 'Sin cuenta';
          const items = Array.isArray(c.items)
            ? (c.items as Record<string, unknown>[])
                .filter((it) => typeof it?.name === 'string' && it.name.trim())
                .map((it) => ({
                  name: String(it.name).trim(),
                  quantity:
                    typeof it.quantity === 'number' && Number.isFinite(it.quantity)
                      ? it.quantity
                      : null,
                  location: mapCsvLocation(String(it.location || 'inventory')),
                  slot:
                    typeof it.slot === 'string' &&
                    VALID_SLOTS.has(it.slot.trim() as EquipmentSlot)
                      ? (it.slot.trim() as EquipmentSlot)
                      : null,
                  tags: Array.isArray(it.tags)
                    ? it.tags.map((t) => String(t).trim()).filter(Boolean)
                    : [],
                  uncertain: Boolean(it.uncertain),
                }))
            : [];
          charBatches.push({server, account, name, items});
        });
      }

      if (Array.isArray(parsed.clans)) {
        parsed.clans.forEach((raw) => {
          if (!raw || typeof raw !== 'object') return;
          const cl = raw as Record<string, unknown>;
          const name = typeof cl.name === 'string' ? cl.name.trim() : '';
          if (!name) return;
          const server =
            typeof cl.server === 'string' && cl.server.trim()
              ? cl.server.trim()
              : defaultServer;
          const items = Array.isArray(cl.items)
            ? (cl.items as Record<string, unknown>[])
                .filter((it) => typeof it?.name === 'string' && it.name.trim())
                .map((it) => ({
                  name: String(it.name).trim(),
                  quantity:
                    typeof it.quantity === 'number' && Number.isFinite(it.quantity)
                      ? it.quantity
                      : null,
                  location: 'clan_warehouse' as ItemLocation,
                  slot: null,
                  tags: Array.isArray(it.tags)
                    ? it.tags.map((t) => String(t).trim()).filter(Boolean)
                    : [],
                  uncertain: Boolean(it.uncertain),
                }))
            : [];
          clanBatches.push({server, name, items});
        });
      }

      if (charBatches.length === 0 && clanBatches.length === 0) {
        return {
          characterBatches: [],
          clanBatches: [],
          error: 'El JSON no contiene personajes o clanes con ítems.',
        };
      }
      return {characterBatches: charBatches, clanBatches};
    } catch {
      return {
        characterBatches: [],
        clanBatches: [],
        error: 'No se pudo leer el archivo JSON de ítems.',
      };
    }
  }

  const {rows} = parseCsvText(clean);
  if (rows.length < 2) {
    return {
      characterBatches: [],
      clanBatches: [],
      error: 'El archivo CSV no contiene filas de datos.',
    };
  }

  const headers = rows[0].map(normHeader);
  const idxServer = headers.findIndex((h) => h === 'servidor' || h === 'server');
  const idxOrigin = headers.findIndex((h) => h === 'origen');
  const idxAccount = headers.findIndex((h) => h === 'cuenta' || h === 'account');
  const idxOwner = headers.findIndex(
    (h) =>
      h === 'personaje o clan' ||
      h === 'personaje' ||
      h === 'clan'
  );
  const idxClan = headers.findIndex((h) => h === 'clan');
  const idxSection = headers.findIndex((h) => h === 'seccion' || h === 'ubicacion');
  const idxSlot = headers.findIndex((h) => h === 'slot');
  const idxItem = headers.findIndex((h) => h === 'objeto' || h === 'item' || h === 'name');
  const idxTags = headers.findIndex((h) => h === 'etiquetas' || h === 'tags');
  const idxQty = headers.findIndex((h) => h === 'cantidad' || h === 'qty');
  const idxUncertain = headers.findIndex((h) => h === 'revisar' || h === 'uncertain');

  if (idxItem < 0 || (idxOwner < 0 && idxClan < 0)) {
    return {
      characterBatches: [],
      clanBatches: [],
      error:
        'Columnas no reconocidas. Sube el CSV de "Inventario completo (detallado)" o "Almacenes de clan".',
    };
  }

  const charMap = new Map<string, PartialItemsCharacterBatch>();
  const clanMap = new Map<string, PartialItemsClanBatch>();

  for (let r = 1; r < rows.length; r++) {
    const c = rows[r];
    const server = (idxServer >= 0 ? c[idxServer] : '')?.trim() || defaultServer;
    const itemName = c[idxItem]?.trim() || '';
    const isClanOnlyCsv = idxOrigin < 0 && idxClan >= 0;
    const originNorm = idxOrigin >= 0 ? normHeader(c[idxOrigin] || '') : '';
    const isClanRow = isClanOnlyCsv || originNorm.includes('clan');

    const tags =
      idxTags >= 0 && c[idxTags]
        ? c[idxTags]
            .split('|')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    const quantity = parseCsvQuantity(idxQty >= 0 ? c[idxQty] : undefined);
    const uncertainRaw = idxUncertain >= 0 ? normHeader(c[idxUncertain] || '') : '';
    const uncertain =
      uncertainRaw === 'si' || uncertainRaw === 'true' || uncertainRaw === '1';

    if (isClanRow) {
      const clanName =
        (idxClan >= 0 ? c[idxClan] : idxOwner >= 0 ? c[idxOwner] : '')?.trim() || '';
      if (!clanName) continue;
      const key = `${server}::${clanName.toLowerCase()}`;
      if (!clanMap.has(key)) {
        clanMap.set(key, {server, name: clanName, items: []});
      }
      if (itemName && itemName !== '(Sin objetos)') {
        clanMap.get(key)!.items.push({
          name: itemName,
          quantity,
          location: 'clan_warehouse',
          slot: null,
          tags,
          uncertain,
        });
      }
    } else {
      const charName = (idxOwner >= 0 ? c[idxOwner] : '')?.trim() || '';
      if (!charName || !itemName) continue;
      const account = (idxAccount >= 0 ? c[idxAccount] : '')?.trim() || 'Sin cuenta';
      const key = `${server}::${account.toLowerCase()}::${charName.toLowerCase()}`;
      if (!charMap.has(key)) {
        charMap.set(key, {server, account, name: charName, items: []});
      }
      const rawSlot = idxSlot >= 0 ? c[idxSlot]?.trim() || '' : '';
      const slot = VALID_SLOTS.has(rawSlot as EquipmentSlot)
        ? (rawSlot as EquipmentSlot)
        : null;
      const location = mapCsvLocation(idxSection >= 0 ? c[idxSection] || '' : 'inventory');
      charMap.get(key)!.items.push({
        name: itemName,
        quantity,
        location,
        slot,
        tags,
        uncertain,
      });
    }
  }

  const characterBatches = Array.from(charMap.values());
  const clanBatches = Array.from(clanMap.values());

  if (characterBatches.length === 0 && clanBatches.length === 0) {
    return {
      characterBatches: [],
      clanBatches: [],
      error: 'No se encontraron ítems válidos para importar.',
    };
  }

  return {characterBatches, clanBatches};
}

