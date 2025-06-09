// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import duckdb from 'duckdb';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const db = new duckdb.Database('md:');
const TABLE = 'entreprises';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'pk.eyJ1IjoiamFjZTE5NSIsImEiOiJjbTc0aTR0aGcwYTJqMnFxeWdnN2N1NTRiIn0.UA9uEMwBO-JpQAkiutk_lg';
if (!MAPBOX_TOKEN) {
  console.warn('⚠️ MAPBOX_TOKEN non défini – la géolocalisation par adresse tombera toujours sur Paris');
}
const geoCache = new Map();

async function ensureCoords(e) {
  const [lng0, lat0] = e.position;
  if (!(lng0 === 2.3522 && lat0 === 48.8566) || !e.address) {
    return e;
  }
  if (geoCache.has(e.address)) {
    return { ...e, position: geoCache.get(e.address) };
  }
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/`
      + `${encodeURIComponent(e.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const resp = await fetch(url);
    if (resp.ok) {
      const js = await resp.json();
      if (js.features?.length) {
        const [lng, lat] = js.features[0].center;
        geoCache.set(e.address, [lng, lat]);
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
  if (Array.isArray(raw)) return raw;
  const [lng, lat] = String(raw)
    .replace(/[\[\]\s]/g, '')
    .split(',')
    .map(Number);
  return [lng, lat];
}

app.get('/api/all', async (_req, res) => {
  try {
    const sql = `
      SELECT siren, name, codeNAF, employeesCategory, address, position
      FROM ${TABLE}
    `;
    db.all(sql, async (err, rows) => {
      if (err) {
        console.error('DuckDB /all error:', err);
        return res.status(500).json({ error: 'Erreur interne DuckDB' });
      }
      const parsed = rows
        .map(e => ({ ...e, position: parsePosition(e.position) }))
        .filter(isCompleteEntreprise);
      const enriched = await Promise.all(parsed.map(ensureCoords));
      res.json(enriched);
    });
  } catch (err) {
    console.error('DuckDB /all error:', err);
    res.status(500).json({ error: 'Erreur interne DuckDB' });
  }
});

app.get('/api/search', async (req, res) => {
  const termRaw = String(req.query.term || '').trim().toLowerCase();
  if (!termRaw) return res.json([]);

  const words = termRaw.split(/\s+/).filter(Boolean);

  let where = [];
  let params = [];
  words.forEach(word => {
    where.push(`(LOWER(name) LIKE ? OR LOWER(address) LIKE ?)`);
    params.push(`%${word}%`, `%${word}%`);
  });
  const whereClause = where.length ? where.join(' AND ') : '1=1';

  const sql = `
    SELECT siren, name, codeNAF, employeesCategory, address, position
    FROM ${TABLE}
    WHERE (${whereClause}) OR siren = ?
    LIMIT 5
  `;
  params.push(termRaw);

  db.all(sql, params, async (err, rows) => {
    if (err) {
      console.error('DuckDB /search error:', err);
      return res.status(500).json({ error: 'Erreur interne DuckDB' });
    }
    const parsed = rows
      .map(e => ({ ...e, position: parsePosition(e.position) }))
      .filter(isCompleteEntreprise);
    const enriched = await Promise.all(parsed.map(ensureCoords));
    res.json(enriched);
  });
});

// --- Tranches effectifs
const employeeTrancheBounds = {
  "1-10":    [1, 10],
  "11-50":   [11, 50],
  "51-200":  [51, 200],
  "201-500": [201, 500],
  "501+":    [501, 100000]
};
const codeRanges = {
  "00": [0, 0],
  "01": [1, 2],
  "02": [3, 5],
  "03": [6, 9],
  "11": [10, 19],
  "12": [20, 49],
  "21": [50, 99],
  "22": [100, 199],
  "31": [200, 249],
  "32": [250, 499],
  "41": [500, 999],
  "42": [1000, 1999],
  "51": [2000, 4999],
  "52": [5000, 9999],
  "53": [10000, 999999],
  "NN": [null, null]
};

// GET /api/search-filters
app.get('/api/search-filters', async (req, res) => {
  console.log('📬 search-filters reçu avec params', req.query);

  const nafRaw = String(req.query.naf || '').trim();
  const empRaw = String(req.query.employeesCategory || '').trim();
  const radius = Number(req.query.radius || 20);
  const lng = Number(req.query.lng);
  const lat = Number(req.query.lat);

  if (
    !nafRaw ||
    isNaN(radius) || radius <= 0 ||
    isNaN(lng) ||
    isNaN(lat)
  ) {
    return res.status(400).json({ error: 'naf, lng, lat, radius sont requis et valides' });
  }

  // SQL sans aucun "?"
  const sql = `
    SELECT *,
      CAST(SPLIT_PART(SPLIT_PART(position, ',', 1), '[', 2) AS DOUBLE) AS lon,
      CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) AS lat,
      6371 * ACOS(
        COS(${lat} * PI() / 180)
        * COS(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
        * COS((CAST(SPLIT_PART(SPLIT_PART(position, ',', 1), '[', 2) AS DOUBLE) - ${lng}) * PI() / 180)
        + SIN(${lat} * PI() / 180)
        * SIN(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
      ) AS distance_km
    FROM ${TABLE}
    WHERE codeNAF LIKE '${nafRaw}%'
      AND 6371 * ACOS(
        COS(${lat} * PI() / 180)
        * COS(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
        * COS((CAST(SPLIT_PART(SPLIT_PART(position, ',', 1), '[', 2) AS DOUBLE) - ${lng}) * PI() / 180)
        + SIN(${lat} * PI() / 180)
        * SIN(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
      ) <= ${radius}
    LIMIT 1000
  `;
  db.all(sql, [], async (err, rows) => {
    if (err) {
      console.error('DuckDB /search-filters error:', err);
      return res.status(500).json({ error: 'Erreur interne DuckDB' });
    }
    const parsed = rows
      .map(e => ({
        ...e,
        position: parsePosition(e.position)
      }))
      .filter(isCompleteEntreprise);

    let filtered = parsed;
    if (empRaw && employeeTrancheBounds[empRaw]) {
      const [tMin, tMax] = employeeTrancheBounds[empRaw];
      filtered = parsed.filter(e => {
        const [catMin, catMax] = codeRanges[e.employeesCategory] || [null, null];
        return catMin !== null && catMax !== null && catMax >= tMin && catMin <= tMax;
      });
    }
    const enriched = await Promise.all(filtered.map(ensureCoords));
    console.log('🔎 Résultats DuckDB:', enriched.length, 'entrées');
    res.json(enriched);
  });
});

// POST /api/search-filters
app.post('/api/search-filters', async (req, res) => {
  const nafs = Array.isArray(req.body.nafs) ? req.body.nafs.filter(Boolean) : [];
  const empRaw = String(req.body.employeesCategory || '').trim();
  const radius = Number(req.body.radius || 20);
  const lng = Number(req.body.lng);
  const lat = Number(req.body.lat);

  if (
    !nafs.length ||
    isNaN(radius) || radius <= 0 ||
    isNaN(lng) ||
    isNaN(lat)
  ) {
    return res.status(400).json({ error: 'nafs, lng, lat, radius sont requis et valides' });
  }

  // Génération de la clause IN
  const inList = nafs.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
  const sql = `
    SELECT *,
      CAST(SPLIT_PART(SPLIT_PART(position, ',', 1), '[', 2) AS DOUBLE) AS lon,
      CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) AS lat,
      6371 * ACOS(
        COS(${lat} * PI() / 180)
        * COS(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
        * COS((CAST(SPLIT_PART(SPLIT_PART(position, ',', 1), '[', 2) AS DOUBLE) - ${lng}) * PI() / 180)
        + SIN(${lat} * PI() / 180)
        * SIN(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
      ) AS distance_km
    FROM ${TABLE}
    WHERE codeNAF IN (${inList})
      AND 6371 * ACOS(
        COS(${lat} * PI() / 180)
        * COS(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
        * COS((CAST(SPLIT_PART(SPLIT_PART(position, ',', 1), '[', 2) AS DOUBLE) - ${lng}) * PI() / 180)
        + SIN(${lat} * PI() / 180)
        * SIN(CAST(SPLIT_PART(SPLIT_PART(position, ',', 2), ']', 1) AS DOUBLE) * PI() / 180)
      ) <= ${radius}
    LIMIT 1000
  `;

  db.all(sql, [], async (err, rows) => {
    if (err) {
      console.error('DuckDB /search-filters error:', err);
      return res.status(500).json({ error: 'Erreur interne DuckDB' });
    }
    const parsed = rows
      .map(e => ({
        ...e,
        position: parsePosition(e.position),
        employeesCategory: e.employeesCategory || empRaw
      }))
      .filter(isCompleteEntreprise);

    const enriched = await Promise.all(parsed.map(ensureCoords));
    console.log('🔎 Résultats DuckDB (section):', enriched.length, 'entrées');
    res.json(enriched);
  });
});

app.get('/api/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
