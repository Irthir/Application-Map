
// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';               // n'oublie pas d'installer node-fetch
import { BigQuery } from '@google-cloud/bigquery';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- CONFIG MAPBOX GEOCODING ---
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'pk.eyJ1IjoiamFjZTE5NSIsImEiOiJjbTc0aTR0aGcwYTJqMnFxeWdnN2N1NTRiIn0.UA9uEMwBO-JpQAkiutk_lg';
if (!MAPBOX_TOKEN) {
  console.warn('⚠️ MAPBOX_TOKEN non défini – la géolocalisation par adresse tombera toujours sur Paris');
}
const geoCache = new Map(); // address → [lng, lat]

async function ensureCoords(e) {
  // si ce n'est pas la paire par défaut, on ne touche pas
  const [lng0, lat0] = e.position;
  if (!(lng0 === 2.3522 && lat0 === 48.8566) || !e.address) {
    return e;
  }
  // cache
  if (geoCache.has(e.address)) {
    return { ...e, position: geoCache.get(e.address) };
  }
  // appel Mapbox
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
                `${encodeURIComponent(e.address)}.json?` +
                `access_token=${MAPBOX_TOKEN}&limit=1`;
    const resp = await fetch(url);
    if (resp.ok) {
      const js = await resp.json();
      if (js.features && js.features.length > 0) {
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

// --- BigQuery setup ---
const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const TABLE_ID = '`application-map-458717.sirene_data.merged_sirene`';

// filtre les entreprises incomplètes
function isCompleteEntreprise(e) {
  if (!e.name?.trim()) return false;
  if (!e.employeesCategory) return false;
  if (!Array.isArray(e.position) || e.position.length !== 2) return false;
  const [lng, lat] = e.position;
  return typeof lng === 'number' && typeof lat === 'number'
      && !Number.isNaN(lng) && !Number.isNaN(lat);
}

// utilitaire pour parser la position issue de BigQuery
function parsePosition(raw) {
  const str = String(raw);
  const [lng, lat] = str.replace(/[\[\]\s]/g, '').split(',').map(Number);
  return [lng, lat];
}

// GET /api/all — renvoie toutes les entreprises complètes, géolocalisées
app.get('/api/all', async (_req, res) => {
  try {
    const query = `
      SELECT siren, name, codeNAF, employeesCategory, address, position
      FROM ${TABLE_ID}
    `;
    const [job] = await bq.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    const parsed = rows
      .map(e => ({ ...e, position: parsePosition(e.position) }))
      .filter(isCompleteEntreprise);

    const enriched = await Promise.all(parsed.map(ensureCoords));
    res.json(enriched);
  } catch (err) {
    console.error('BigQuery /all error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

// GET /api/search?term=… — renvoie jusqu’à 5 suggestions, géolocalisées
app.get('/api/search', async (req, res) => {
  const termRaw = String(req.query.term || '').trim().toLowerCase();
  if (!termRaw) return res.json([]);

  try {
    const query = `
      SELECT siren, name, codeNAF, employeesCategory, address, position
      FROM ${TABLE_ID}
      WHERE LOWER(name) LIKE @patt
         OR siren = @term
         OR LOWER(address) LIKE @patt
      LIMIT 5
    `;
    const options = {
      query,
      params: {
        patt: `%${termRaw}%`,
        term: termRaw
      }
    };
    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    const parsed = rows
      .map(e => ({ ...e, position: parsePosition(e.position) }))
      .filter(isCompleteEntreprise);

    const enriched = await Promise.all(parsed.map(ensureCoords));
    res.json(enriched);
  } catch (err) {
    console.error('BigQuery /search error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
