// server.js optimisé complet
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import duckdb from 'duckdb';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- Logger temps réponse ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`⚠️ Requête lente : ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

// --- BDD ---
let db;
try {
  db = new duckdb.Database('md:');
} catch (err) {
  console.error('Erreur à l’ouverture de DuckDB:', err);
  process.exit(1);
}
const TABLE = 'entreprises';

// --- MAPBOX ---
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  console.warn('⚠️ MAPBOX_TOKEN non défini – la géolocalisation par adresse tombera toujours sur Paris');
}

// --- GeoCache persistant ---
const geoCacheFile = './geocache.json';
const geoCache = new Map(
  fs.existsSync(geoCacheFile)
    ? Object.entries(JSON.parse(fs.readFileSync(geoCacheFile, 'utf-8')))
    : []
);
function saveGeoCache() {
  fs.writeFileSync(geoCacheFile, JSON.stringify(Object.fromEntries(geoCache)));
}

async function ensureCoords(e) {
  const [lng0, lat0] = e.position;
  if (!(lng0 === 2.3522 && lat0 === 48.8566) || !e.address) return e;
  if (geoCache.has(e.address)) {
    return { ...e, position: geoCache.get(e.address) };
  }
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(e.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const resp = await fetch(url);
    if (resp.ok) {
      const js = await resp.json();
      if (js.features?.length) {
        const [lng, lat] = js.features[0].center;
        geoCache.set(e.address, [lng, lat]);
        saveGeoCache();
        return { ...e, position: [lng, lat] };
      }
    }
  } catch (err) {
    console.warn('Geocoding failed for', e.address, err.message);
  }
  return e;
}

function isCompleteEntreprise(e) {
  if (!e.name?.trim()) return false;
  if (!e.employeesCategory) return false;
  if (!Array.isArray(e.position) || e.position.length !== 2) return false;
  const [lng, lat] = e.position;
  return typeof lng === 'number' && typeof lat === 'number'
    && !Number.isNaN(lng) && !Number.isNaN(lat);
}

function parsePosition(raw) {
  try {
    const pos = JSON.parse(raw);
    if (Array.isArray(pos) && pos.length === 2) return pos.map(Number);
  } catch {}
  return [2.3522, 48.8566];
}

// --- Effectif mappings ---
const employeeTrancheBounds = {
  "1-10":    [1, 10],
  "11-50":   [11, 50],
  "51-200":  [51, 200],
  "201-500": [201, 500],
  "501+":    [501, 100000]
};
const codeRanges = {
  "00": [0, 0],    "01": [1, 2],    "02": [3, 5],    "03": [6, 9],
  "11": [10, 19],  "12": [20, 49],  "21": [50, 99],  "22": [100, 199],
  "31": [200, 249],"32": [250, 499],"41": [500, 999],"42": [1000, 1999],
  "51": [2000, 4999],"52": [5000, 9999],"53": [10000, 999999],"NN": [null, null]
};

// --- GET /api/all ---
app.get('/api/all', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const sql = `
    SELECT siren, name, codeNAF, employeesCategory, address, position
    FROM ${TABLE}
    WHERE position IS NOT NULL AND position <> '[2.3522,48.8566]'
    LIMIT ${limit} OFFSET ${offset};
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('DuckDB /all error:', err);
      return res.status(500).json({ error: 'Erreur interne DuckDB' });
    }
    const parsed = rows
      .map(e => ({ ...e, position: parsePosition(e.position) }))
      .filter(isCompleteEntreprise);
    res.json(parsed);
  });
});

// --- SEARCH texte ---
app.get('/api/search', async (req, res) => {
  const termRaw = String(req.query.term || '').trim().toLowerCase();
  if (!termRaw) return res.json([]);

  const safeTerm = termRaw.replace(/'/g, "''");
  const sql = `
    SELECT siren, name, codeNAF, employeesCategory, address, position
    FROM ${TABLE}
    WHERE LOWER(name) LIKE '%${safeTerm}%'
       OR LOWER(address) LIKE '%${safeTerm}%'
       OR siren LIKE '%${safeTerm}%'
    LIMIT 5
  `;

  db.all(sql, async (err, rows) => {
    if (err) {
      console.error('DuckDB /search error:', err, '\nSQL:', sql);
      return res.status(500).json({ error: 'Erreur interne DuckDB', detail: err.message });
    }
    const parsed = rows
      .map(e => ({ ...e, position: parsePosition(e.position) }))
      .filter(isCompleteEntreprise);
    const enriched = await Promise.all(parsed.map(ensureCoords));
    res.json(enriched);
  });
});

// --- SEARCH FILTERS GET ---
app.get('/api/search-filters', (req, res) => {
  const nafRaw = String(req.query.naf || '').trim();
  const empRaw = String(req.query.employeesCategory || '').trim();
  const radius = Number(req.query.radius || 20);
  const lng = Number(req.query.lng);
  const lat = Number(req.query.lat);

  if (!nafRaw || isNaN(radius) || radius <= 0 || isNaN(lng) || isNaN(lat)) {
    return res.status(400).json({ error: 'naf, lng, lat, radius sont requis et valides' });
  }

  const sql = `
    WITH coords AS (
      SELECT siren, name, codeNAF, employeesCategory, address, position,
        CAST(split_part(trim(both '[]' FROM position), ',', 1) AS DOUBLE) AS lng2,
        CAST(split_part(trim(both '[]' FROM position), ',', 2) AS DOUBLE) AS lat2
      FROM ${TABLE}
      WHERE position IS NOT NULL AND position <> '[2.3522,48.8566]' AND codeNAF LIKE '${nafRaw}%'
    )
    SELECT DISTINCT siren, name, codeNAF, employeesCategory, address, position,
      6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - ${lat}) / 2), 2) +
        COS(RADIANS(${lat})) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lng2 - ${lng}) / 2), 2)
      )) AS distance
    FROM coords
    WHERE distance <= ${radius}
    ORDER BY distance
    LIMIT 50;
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('DuckDB /search-filters SQL error:', err, '\nSQL:', sql);
      return res.status(500).json({ error: 'Erreur interne DuckDB', detail: err.message });
    }
    const parsed = rows.map(r => {
      try {
        const pos = JSON.parse(r.position);
        if (Array.isArray(pos) && pos.length === 2 && typeof pos[0] === 'number' && typeof pos[1] === 'number') {
          return { ...r, position: pos };
        }
      } catch {}
      return null;
    }).filter(Boolean);

    let finalRows = parsed;
    if (empRaw && employeeTrancheBounds[empRaw]) {
      const [tMin, tMax] = employeeTrancheBounds[empRaw];
      finalRows = parsed.filter(e => {
        const [catMin, catMax] = codeRanges[e.employeesCategory] || [null, null];
        return catMin !== null && catMax !== null && catMax >= tMin && catMin <= tMax;
      });
    }

    res.json(finalRows);
  });
});

// --- SEARCH FILTERS POST ---
app.post('/api/search-filters', (req, res) => {
  const nafs = Array.isArray(req.body.nafs) ? req.body.nafs.filter(Boolean) : [];
  const empRaw = String(req.body.employeesCategory || '').trim();
  const radius = Number(req.body.radius || 20);
  const lng = Number(req.body.lng);
  const lat = Number(req.body.lat);

  if (!nafs.length || isNaN(radius) || radius <= 0 || isNaN(lng) || isNaN(lat)) {
    return res.status(400).json({ error: 'nafs, lng, lat, radius sont requis et valides' });
  }

  const inList = nafs.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
  const sql = `
    WITH coords AS (
      SELECT siren, name, codeNAF, employeesCategory, address, position,
        CAST(split_part(trim(both '[]' FROM position), ',', 1) AS DOUBLE) AS lng2,
        CAST(split_part(trim(both '[]' FROM position), ',', 2) AS DOUBLE) AS lat2
      FROM ${TABLE}
      WHERE position IS NOT NULL AND position <> '[2.3522,48.8566]' AND codeNAF IN (${inList})
    )
    SELECT DISTINCT siren, name, codeNAF, employeesCategory, address, position,
      6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - ${lat}) / 2), 2) +
        COS(RADIANS(${lat})) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lng2 - ${lng}) / 2), 2)
      )) AS distance
    FROM coords
    WHERE distance <= ${radius}
    ORDER BY distance
    LIMIT 50;
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error('DuckDB /search-filters SQL error:', err, '\nSQL:', sql);
      return res.status(500).json({ error: 'Erreur interne DuckDB', detail: err.message });
    }
    const parsed = rows.map(r => {
      try {
        const pos = JSON.parse(r.position);
        if (Array.isArray(pos) && pos.length === 2 && typeof pos[0] === 'number' && typeof pos[1] === 'number') {
          return { ...r, position: pos };
        }
      } catch {}
      return null;
    }).filter(Boolean);

    let finalRows = parsed;
    if (empRaw && employeeTrancheBounds[empRaw]) {
      const [tMin, tMax] = employeeTrancheBounds[empRaw];
      finalRows = parsed.filter(e => {
        const [catMin, catMax] = codeRanges[e.employeesCategory] || [null, null];
        return catMin !== null && catMax !== null && catMax >= tMin && catMin <= tMax;
      });
    }

    res.json(finalRows);
  });
});

// --- PING ---
app.get('/api/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
