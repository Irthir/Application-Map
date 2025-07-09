// server.js optimisé
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

// --- Autres endpoints (search, filters, etc.) restent identiques sauf si enrichissement nécessaire ---

// --- PING ---
app.get('/api/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

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

// --- Launch server ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
