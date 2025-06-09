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
  if (isNaN(lng) || isNaN(lat)) {
    // Log pour détecter des positions foireuses
    console.warn('Position invalide détectée:', raw);
  }
  return [lng, lat];
}

// --- ALL
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

// --- SEARCH (texte)
app.get('/api/search', async (req, res) => {
  const termRaw = String(req.query.term || '').trim().toLowerCase();
  if (!termRaw) return res.json([]);

  // Clean et échappe les guillemets simples
  const safeTerm = termRaw.replace(/'/g, "''");

  const sql = `
    SELECT siren, name, codeNAF, employeesCategory, address, position
    FROM ${TABLE}
    WHERE LOWER(name) LIKE '%${safeTerm}%'
       OR LOWER(address) LIKE '%${safeTerm}%'
       OR siren LIKE '%${safeTerm}%'
    LIMIT 5
  `;

  console.log('SQL recherche:', sql);

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


// --- MAPPING TRANCHE UI -> BORNES D'EFFECTIF
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

// --- SEARCH FILTERS (GET) --- AVEC géocodage et filtrage JS
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

  // 1. On NE filtre que par code NAF en SQL
  const sql = `
    SELECT *, position, address, siren, employeesCategory
    FROM ${TABLE}
    WHERE codeNAF LIKE '${nafRaw}%'
    LIMIT 3000
  `;

  db.all(sql, async (err, rows) => {
    if (err) {
      console.error('DuckDB /search-filters error:', err);
      return res.status(500).json({ error: 'Erreur interne DuckDB' });
    }
    // 2. On enrichit les coordonnées manquantes ou incomplètes
    const enriched = await Promise.all(
      rows.map(async e => {
        let pos = parsePosition(e.position);
        if (!pos || pos.length !== 2 || isNaN(pos[0]) || isNaN(pos[1]) ||
            (pos[0] === 2.3522 && pos[1] === 48.8566)) {
          const enrichedE = await ensureCoords({ ...e, position: pos, address: e.address });
          // En tâche de fond : update la BDD si la position a été modifiée
          if (
            enrichedE.position && enrichedE.position.length === 2 &&
            enrichedE.position[0] !== pos[0] && enrichedE.position[1] !== pos[1]
          ) {
            process.nextTick(() => {
              db.run(
                `UPDATE ${TABLE} SET position = '[${enrichedE.position[0]},${enrichedE.position[1]}]' WHERE siren = ?`,
                [enrichedE.siren],
                err => {
                  if (err) console.warn("Échec update position pour", enrichedE.siren, err.message);
                }
              );
            });
          }
          return enrichedE;
        }
        return { ...e, position: pos };
      })
    );

    // 3. Refiltres manuellement PAR DISTANCE autour du centre choisi
    const filtered = enriched
      .filter(e => isCompleteEntreprise(e))
      .filter(e => {
        const [lng2, lat2] = e.position;
        // Haversine
        function toRad(d) { return d * Math.PI / 180; }
        const R = 6371;
        const dLat = toRad(lat2 - lat);
        const dLng = toRad(lng2 - lng);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d <= radius;
      });

    // 4. Filtre encore selon l’effectif, si demandé
    let filteredFinal = filtered;
    if (empRaw && employeeTrancheBounds[empRaw]) {
      const [tMin, tMax] = employeeTrancheBounds[empRaw];
      filteredFinal = filtered.filter(e => {
        const [catMin, catMax] = codeRanges[e.employeesCategory] || [null, null];
        return catMin !== null && catMax !== null && catMax >= tMin && catMin <= tMax;
      });
    }
    console.log('🔎 Résultats filtrés (post-géocodage):', filteredFinal.length, 'entrées');
    res.json(filteredFinal);
  });
});

// --- SEARCH FILTERS (POST) --- idem (multi-codes NAF)
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

  const inList = nafs.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
  const sql = `
    SELECT *, position, address, siren, employeesCategory
    FROM ${TABLE}
    WHERE codeNAF IN (${inList})
    LIMIT 3000
  `;

  db.all(sql, async (err, rows) => {
    if (err) {
      console.error('DuckDB /search-filters error:', err);
      return res.status(500).json({ error: 'Erreur interne DuckDB' });
    }
    // 2. On enrichit les coordonnées manquantes ou incomplètes
    const enriched = await Promise.all(
      rows.map(async e => {
        let pos = parsePosition(e.position);
        if (!pos || pos.length !== 2 || isNaN(pos[0]) || isNaN(pos[1]) ||
            (pos[0] === 2.3522 && pos[1] === 48.8566)) {
          const enrichedE = await ensureCoords({ ...e, position: pos, address: e.address });
          // En tâche de fond : update la BDD si la position a été modifiée
          if (
            enrichedE.position && enrichedE.position.length === 2 &&
            enrichedE.position[0] !== pos[0] && enrichedE.position[1] !== pos[1]
          ) {
            process.nextTick(() => {
              db.run(
                `UPDATE ${TABLE} SET position = '[${enrichedE.position[0]},${enrichedE.position[1]}]' WHERE siren = ?`,
                [enrichedE.siren],
                err => {
                  if (err) console.warn("Échec update position pour", enrichedE.siren, err.message);
                }
              );
            });
          }
          return enrichedE;
        }
        return { ...e, position: pos };
      })
    );

    // 3. Refiltres manuellement PAR DISTANCE autour du centre choisi
    const filtered = enriched
      .filter(e => isCompleteEntreprise(e))
      .filter(e => {
        const [lng2, lat2] = e.position;
        // Haversine
        function toRad(d) { return d * Math.PI / 180; }
        const R = 6371;
        const dLat = toRad(lat2 - lat);
        const dLng = toRad(lng2 - lng);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d <= radius;
      });

    // 4. Filtre encore selon l’effectif, si demandé
    let filteredFinal = filtered;
    if (empRaw && employeeTrancheBounds[empRaw]) {
      const [tMin, tMax] = employeeTrancheBounds[empRaw];
      filteredFinal = filtered.filter(e => {
        const [catMin, catMax] = codeRanges[e.employeesCategory] || [null, null];
        return catMin !== null && catMax !== null && catMax >= tMin && catMin <= tMax;
      });
    }
    console.log('🔎 Résultats filtrés (post-géocodage):', filteredFinal.length, 'entrées');
    res.json(filteredFinal);
  });
});

// --- PING ---
app.get('/api/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
