import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;
const MINI_PC_API = 'https://hideously-vocal-mudfish.ngrok-free.app';

app.use(cors({ origin: 'https://irthir.github.io' }));
app.use(express.json());

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const geoCache = new Map();

if (!MAPBOX_TOKEN) {
  console.warn('⚠️ MAPBOX_TOKEN non défini – fallback Paris');
}

function parsePosition(raw) {
  if (Array.isArray(raw)) return raw;
  const [lng, lat] = String(raw).replace(/[[\]\s]/g, '').split(',').map(Number);
  return isNaN(lng) || isNaN(lat) ? [2.3522, 48.8566] : [lng, lat];
}

async function ensureCoords(e) {
  const [lng, lat] = e.position || [];
  if (lng !== 2.3522 || lat !== 48.8566 || !e.address) return e;
  if (geoCache.has(e.address)) return { ...e, position: geoCache.get(e.address) };

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
    console.warn(`❌ Geocoding failed: ${e.address}`, err.message);
  }

  return e;
}

async function fetchWithTimeout(url, options = {}, timeout = 90000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function dedupeBySiren(arr) {
  const seen = new Set();
  return arr.filter(e => {
    if (seen.has(e.siren)) return false;
    seen.add(e.siren);
    return true;
  });
}

// --- ALL
app.get('/api/all', async (_req, res) => {
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises`);
    const raw = await resp.json();
    const enriched = await Promise.all(
      raw.map(e => ({ ...e, position: parsePosition(e.position) }))
         .map(ensureCoords)
    );
    res.json(dedupeBySiren(enriched));
  } catch (err) {
    console.error('❌ Erreur API /all:', err.message);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- SEARCH
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
    res.json(dedupeBySiren(enriched));
  } catch (err) {
    console.error('❌ Erreur API /search:', err.message);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- SEARCH FILTERS GET (limit: 30)
app.get('/api/search-filters', async (req, res) => {
  const qs = new URLSearchParams({ ...req.query, limit: 30 }).toString();

  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises/filter?${qs}`);
    const data = await resp.json();
    res.json(dedupeBySiren(data));
  } catch (err) {
    console.error('❌ Erreur API /search-filters GET:', err.message);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- SEARCH FILTERS POST (limit: 30)
app.post('/api/search-filters', async (req, res) => {
  const body = { ...req.body, limit: 30 };
  try {
    const resp = await fetchWithTimeout(`${MINI_PC_API}/entreprises/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    res.json(dedupeBySiren(data));
  } catch (err) {
    console.error('❌ Erreur API /search-filters POST:', err.message);
    res.status(500).json({ error: 'Erreur mini-PC distant' });
  }
});

// --- PING
app.get('/api/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

// --- HEALTH
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
  console.log(`🚀 Serveur Render (proxy) lancé sur le port ${PORT}`);
});
