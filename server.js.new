import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;
const MINI = 'https://hideously-vocal-mudfish.ngrok-free.app';

app.use(cors({ origin: 'https://irthir.github.io' }));
app.use(express.json());

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) console.warn('⚠️ Pas de MAPBOX_TOKEN');

const geoCache = new Map();

function parsePosition(raw) {
  if (Array.isArray(raw)) return raw;
  const [lng, lat] = String(raw).replace(/[[\]\s]/g,'').split(',').map(Number);
  return (!isNaN(lng) && !isNaN(lat)) ? [lng, lat] : [2.3522,48.8566];
}

async function ensureCoords(e) {
  const [lng0,lat0] = e.position;
  if (!(lng0===2.3522 && lat0===48.8566) || !e.address) return e;
  if (geoCache.has(e.address)) return {...e, position: geoCache.get(e.address)};
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(e.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const rsp = await fetch(url);
    if (rsp.ok) {
      const js = await rsp.json();
      if (js.features?.length) {
        const [lng, lat] = js.features[0].center;
        geoCache.set(e.address, [lng,lat]);
        return {...e, position: [lng,lat]};
      }
    }
  } catch {}
  return e;
}

function dedupe(arr) {
  const set = new Set();
  return arr.filter(e => {
    if (set.has(e.siren)) return false;
    set.add(e.siren);
    return true;
  });
}

async function fetchTimeout(url, opts={}, timeout=180000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), timeout);
  try {
    return await fetch(url, {...opts, signal:c.signal});
  } finally {
    clearTimeout(id);
  }
}

async function proxyArrayFetch(path, builder) {
  try {
    const resp = await fetchTimeout(MINI + path);
    const json = await resp.json();
    if (!Array.isArray(json)) return null;
    const parsed = json.map(e => ({...e, position: parsePosition(e.position)}));
    const enriched = await Promise.all(parsed.map(ensureCoords));
    return dedupe(enriched);
  } catch (err) {
    console.error(`Erreur ${path}`, err.message);
    return null;
  }
}

app.get('/api/all', async (req, res) => {
  const arr = await proxyArrayFetch('/entreprises');
  if (!arr) return res.status(502).json({error: 'mini-PC KO'});
  res.json(arr);
});

app.get('/api/search', async (req, res) => {
  const term = String(req.query.term||'').trim();
  if (!term) return res.json([]);
  const arr = await proxyArrayFetch(`/entreprises/search?term=${encodeURIComponent(term)}`);
  if (!arr) return res.status(502).json({error: 'mini-PC KO'});
  res.json(arr);
});

app.get('/api/search-filters', async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  const arr = await proxyArrayFetch(`/entreprises/filter?${qs}`);
  if (!arr) return res.status(502).json({error: 'mini-PC KO'});
  res.json(arr);
});

app.post('/api/search-filters', async (req, res) => {
  const options = {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(req.body)
  };
  try {
    const resp = await fetchTimeout(MINI + '/entreprises/filter', options);
    const json = await resp.json();
    if (!Array.isArray(json)) return res.status(502).json({error:'mini-PC KO'});
    res.json(json);
  } catch (err) {
    console.error('/entreprises/filter POST', err.message);
    res.status(502).json({error:'mini-PC KO'});
  }
});

app.get('/api/ping', (req, res) => res.json({pong:true, ts: Date.now()}));
app.get('/api/health', async (req, res) => {
  try {
    await fetchTimeout(MINI + '/health');
    res.json({ok:true});
  } catch {
    res.status(502).json({error:'mini-PC KO'});
  }
});

app.listen(PORT, () => console.log(`🚀 Proxy Render lancé sur port ${PORT}`));
