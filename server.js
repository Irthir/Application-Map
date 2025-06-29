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
  return (!isNaN(lng) && !isNaN(lat)) ? [lng, lat] : [2.3522, 48.8566];
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

function dedupeBySiren(arr) {
  const seen = new Set();
  return arr.filter(e => {
    if (seen.has(e.siren)) return false;
    seen.add(e.siren);
    return true;
  });
}

async function fetchWithTimeout(url, options = {}, timeout = 180_000) {
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
    if (!Array.isArray(raw)) return res.status(502).json({ error: 'Réponse invalide du mini-PC' });

    const enriched = await Promise.all(
      raw.map(e => ({ ...e, position: parsePosition(e.position) }))
         .map(ensureCoords)
    );
    res.json(dedupeBySiren(enriched));
  } catch (err) {
    console.error('Erreur API /all:', err.message);
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
    if (!Array.isArray(raw)) return res.status(502).json({ error: 'Réponse invalide du mini-PC' });

    const enriched = await Promise.all(
      raw.map(e => ({ ...e, position: parsePosition(e.position) }))
         .map(ensureCoords)
    );
    res.json(dedupeBySiren(enriched));
  } catch (err) {
    console.error('Erreur API /search:', err.message);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- /api/search-filters GET
app.get('/api/search-filters', async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises/filter?${qs}`);
    const data = await resp.json();
    if (!Array.isArray(data)) return res.status(502).json({ error: 'Réponse invalide du mini-PC' });
    res.json(data);
  } catch (err) {
    console.error('Erreur API /search-filters GET:', err.message);
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
    if (!Array.isArray(data)) return res.status(502).json({ error: 'Réponse invalide du mini-PC' });
    res.json(data);
  } catch (err) {
    console.error('Erreur API /search-filters POST:', err.message);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

app.get('/api/ping', (_req, res) => res.json({ pong: true, ts: Date.now() }));

app.get('/api/health', async (_req, res) => {
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/health`);
    const json = await resp.json();
    res.json({ ...json, status: 'ok' });
  } catch {
    res.status(500).json({ error: 'mini-PC injoignable' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur proxy Render lancé sur http://localhost:${PORT}`);
});
