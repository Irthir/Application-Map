import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;
const MINI_PC_API = 'https://hideously-vocal-mudfish.ngrok-free.app';

app.use(cors({
  origin: 'https://irthir.github.io'
}));
app.use(express.json());

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  console.warn('⚠️ MAPBOX_TOKEN non défini – géolocalisation par défaut à Paris');
}

const geoCache = new Map();

function parsePosition(raw) {
  if (Array.isArray(raw)) return raw;
  const [lng, lat] = String(raw)
    .replace(/[[\]\s]/g, '')
    .split(',')
    .map(Number);
  if (isNaN(lng) || isNaN(lat)) {
    console.warn('Position invalide détectée:', raw);
  }
  return [lng, lat];
}

async function ensureCoords(e) {
  const [lng0, lat0] = e.position || [null, null];
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
        return { ...e, position: [lng, lat] };
      }
    }
  } catch (err) {
    console.warn('Geocoding failed for', e.address, err.message);
  }

  return e;
}

// --- Fonction utilitaire avec timeout (par défaut 120s)
async function fetchWithTimeout(url, options = {}, timeout = 120000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// --- /api/all
app.get('/api/all', async (_req, res) => {
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises`);
    const raw = await resp.json();
    const enriched = await Promise.all(
      raw.map(e => ({ ...e, position: parsePosition(e.position) }))
         .map(ensureCoords)
    );
    res.json(enriched);
  } catch (err) {
    console.error('Erreur API /all:', err);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- /api/search
app.get('/api/search', async (req, res) => {
  const term = String(req.query.term || '').trim();
  if (!term) return res.json([]);

  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises/search?term=${encodeURIComponent(term)}`);
    const raw = await resp.json();
    const enriched = await Promise.all(
      raw.map(e => ({ ...e, position: parsePosition(e.position) }))
         .map(ensureCoords)
    );
    res.json(enriched);
  } catch (err) {
    console.error('Erreur API /search:', err);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- /api/search-filters GET
app.get('/api/search-filters', async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises/filter?${qs}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('Erreur API /search-filters GET:', err);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- /api/search-filters POST
app.post('/api/search-filters', async (req, res) => {
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('Erreur API /search-filters POST:', err);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- /api/ping
app.get('/api/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

// --- /api/health
app.get('/api/health', async (_req, res) => {
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/health`);
    const json = await resp.json();
    res.json({ ...json, status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'mini-PC injoignable' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Render (proxy) lancé sur le port ${PORT}`);
});
