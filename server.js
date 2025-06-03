// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';               // npm install node-fetch
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
const geoCache = new Map();

async function ensureCoords(e) {
  const [lng0, lat0] = e.position;
  // si on n’est pas sur Paris (valeur par défaut) ou pas d’adresse, on laisse tel quel
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

// --- BigQuery setup ---
const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const TABLE_ID = '`application-map-458717.sirene_data.entreprises_fusion_final`';

// filtre les entreprises incomplètes
function isCompleteEntreprise(e) {
  if (!e.name?.trim()) return false;
  if (!e.employeesCategory) return false;
  if (!Array.isArray(e.position) || e.position.length !== 2) return false;
  const [lng, lat] = e.position;
  return typeof lng === 'number' && typeof lat === 'number'
      && !Number.isNaN(lng) && !Number.isNaN(lat);
}

// lit la chaîne "[lng,lat]" et renvoie [lng, lat]
function parsePosition(raw) {
  const [lng, lat] = String(raw)
    .replace(/[\[\]\s]/g, '')
    .split(',')
    .map(Number);
  return [lng, lat];
}

// GET /api/all — toutes les entreprises complètes, géocodées
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

// GET /api/search?term=… — jusqu’à 5 suggestions texte, géocodées
app.get('/api/search', async (req, res) => {
  const termRaw = String(req.query.term || '').trim().toLowerCase();
  if (!termRaw) return res.json([]);

  const words = termRaw.split(/\s+/).filter(Boolean);

  let nameAddressClauses = [];
  let params = {};
  words.forEach((word, idx) => {
    nameAddressClauses.push(`(LOWER(name) LIKE @w${idx} OR LOWER(address) LIKE @w${idx})`);
    params[`w${idx}`] = `%${word}%`;
  });

  // Met SIREN dans un OR global, pas AND
  const nameAddressConds = nameAddressClauses.length ? nameAddressClauses.join(' AND ') : '1=1';
  const where = `(${nameAddressConds}) OR siren = @term`;
  params.term = termRaw;

  const query = `
    SELECT siren, name, codeNAF, employeesCategory, address, position
    FROM ${TABLE_ID}
    WHERE ${where}
    LIMIT 5
  `;

  try {
    const options = { query, params };
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

// ... (tout le haut de server.js inchangé)

// MAPPING TRANCHE UI -> BORNES D'EFFECTIF
const employeeTrancheBounds = {
  "1-10":    [1, 10],
  "11-50":   [11, 50],
  "51-200":  [51, 200],
  "201-500": [201, 500],
  "501+":    [501, 100000]
};
// MAPPING CODE SIRENE -> BORNES
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

// GET /api/search-filters?naf=…&employeesCategory=…&radius=…&lng=…&lat=…
app.get('/api/search-filters', async (req, res) => {
  console.log('📬 search-filters reçu avec params', req.query);
  const nafRaw = String(req.query.naf || '').trim();
  const empRaw = String(req.query.employeesCategory || '').trim();
  const radius = Number(req.query.radius || 20);
  const lng = Number(req.query.lng);
  const lat = Number(req.query.lat);

  if (!nafRaw || isNaN(lng) || isNaN(lat)) {
    return res.status(400).json({ error: 'naf, lng, lat sont requis' });
  }

  try {
    // La requête SQL NE FILTRE PAS sur employeesCategory (pour tous les résultats de la zone/rayon)
    const query = `
      WITH entreprises AS (
        SELECT
          siren,
          name,
          codeNAF,
          employeesCategory,
          address,
          position,
          lon,
          lat,
          (
            6371 * ACOS(
              COS(@lat * 3.141592653589793 / 180)
              * COS(lat * 3.141592653589793 / 180)
              * COS((lon - @lng) * 3.141592653589793 / 180)
              + SIN(@lat * 3.141592653589793 / 180)
              * SIN(lat * 3.141592653589793 / 180)
            )
          ) AS distance_km
        FROM application-map-458717.sirene_data.entreprises_fusion_final
        WHERE codeNAF LIKE @naf
          AND (
            6371 * ACOS(
              COS(@lat * 3.141592653589793 / 180)
              * COS(lat * 3.141592653589793 / 180)
              * COS((lon - @lng) * 3.141592653589793 / 180)
              + SIN(@lat * 3.141592653589793 / 180)
              * SIN(lat * 3.141592653589793 / 180)
            ) <= @radius
          )
      )
      SELECT *
      FROM (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY siren ORDER BY distance_km ASC) AS rn
        FROM entreprises
      )
      WHERE rn = 1
      LIMIT 1000
    `;
    const options = {
      query,
      params: {
        naf: `${nafRaw}%`,
        radius,
        lng,
        lat,
      }
    };
    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    // Parse et enrichit comme d'habitude
    const parsed = rows
      .map(e => ({
        ...e,
        position: parsePosition(e.position)
      }))
      .filter(isCompleteEntreprise);

    // ------ FILTRAGE EFFECTIF CÔTÉ JS SELON LA TRANCHE ------
    let filtered = parsed;
    if (empRaw && employeeTrancheBounds[empRaw]) {
      const [tMin, tMax] = employeeTrancheBounds[empRaw];
      filtered = parsed.filter(e => {
        const [catMin, catMax] = codeRanges[e.employeesCategory] || [null, null];
        // Inclure uniquement si la plage du code recouvre au moins partiellement la tranche demandée
        // (ou inverser la logique selon besoin)
        return catMin !== null && catMax !== null && catMax >= tMin && catMin <= tMax;
      });
    }

    const enriched = await Promise.all(filtered.map(ensureCoords));
    console.log('🔎 Résultats BigQuery:', enriched.length, 'entrées');
    res.json(enriched);
  } catch (err) {
    console.error('BigQuery /search-filters error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});


// POST /api/search-filters — recherche par plusieurs codes NAF (pour la recherche par section)
app.post('/api/search-filters', async (req, res) => {
  const nafs = req.body.nafs;
  const empRaw = String(req.body.employeesCategory || '').trim();
  const radius = Number(req.body.radius || 20);
  const lng = Number(req.body.lng);
  const lat = Number(req.body.lat);

  if (!nafs || !Array.isArray(nafs) || !nafs.length || isNaN(lng) || isNaN(lat)) {
    return res.status(400).json({ error: 'nafs, lng, lat sont requis' });
  }

  try {
    const query = `
      WITH entreprises AS (
        SELECT
          siren,
          name,
          codeNAF,
          employeesCategory,
          address,
          position,
          lon,
          lat,
          (
            6371 * ACOS(
              COS(@lat * 3.141592653589793 / 180)
              * COS(lat * 3.141592653589793 / 180)
              * COS((lon - @lng) * 3.141592653589793 / 180)
              + SIN(@lat * 3.141592653589793 / 180)
              * SIN(lat * 3.141592653589793 / 180)
            )
          ) AS distance_km
        FROM application-map-458717.sirene_data.entreprises_fusion_final
        WHERE codeNAF IN UNNEST(@nafs)
          AND (
            @emp = "" OR
            employeesCategory = @emp OR employeesCategory IS NULL
          )
          AND (
            6371 * ACOS(
              COS(@lat * 3.141592653589793 / 180)
              * COS(lat * 3.141592653589793 / 180)
              * COS((lon - @lng) * 3.141592653589793 / 180)
              + SIN(@lat * 3.141592653589793 / 180)
              * SIN(lat * 3.141592653589793 / 180)
            ) <= @radius
          )
      )
      SELECT *
      FROM (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY siren ORDER BY distance_km ASC) AS rn
        FROM entreprises
      )
      WHERE rn = 1
      LIMIT 1000
    `;
    const options = {
      query,
      params: {
        nafs,
        emp: empRaw,
        radius,
        lng,
        lat,
      }
    };
    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    const parsed = rows
      .map(e => ({
        ...e,
        position: parsePosition(e.position),
        employeesCategory: e.employeesCategory || empRaw
      }))
      .filter(isCompleteEntreprise);

    const enriched = await Promise.all(parsed.map(ensureCoords));
    console.log('🔎 Résultats BigQuery (section):', enriched.length, 'entrées');
    res.json(enriched);
  } catch (err) {
    console.error('BigQuery /search-filters error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
