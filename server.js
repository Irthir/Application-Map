// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Instanciation BigQuery
const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
});

// Table BigQuery (dataset.table)
const TABLE_ID = '`application-map-458717.sirene_data.merged_sirene`';

// Vérifie qu'une entreprise a bien tous ses champs et une position parseable
function isCompleteEntreprise(e) {
  if (!e.name || typeof e.name !== 'string' || !e.name.trim()) return false;
  if (!e.employeesCategory || typeof e.employeesCategory !== 'string') return false;
  if (!e.position || !Array.isArray(e.position) || e.position.length !== 2) return false;
  const [lng, lat] = e.position;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (Number.isNaN(lng) || Number.isNaN(lat)) return false;
  return true;
}

// GET /api/all — renvoie toutes les entreprises complètes
app.get('/api/all', async (_req, res) => {
  try {
    const query = `
      SELECT siren, name, codeNAF, employeesCategory, address, position
      FROM ${TABLE_ID}
    `;
    const [job] = await bq.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    // Parse la position et filtre
    const results = rows
      .map(e => {
        // e.position vient en string "[lng,lat]"
        const [lng, lat] = String(e.position)
          .replace(/[\[\]\s]/g, '')
          .split(',')
          .map(Number);
        return { ...e, position: [lng, lat] };
      })
      .filter(isCompleteEntreprise);

    res.json(results);
  } catch (err) {
    console.error('BigQuery /all error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

// GET /api/search?term=… — renvoie jusqu’à 5 suggestions
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

    // Parse la position et filtre
    const results = rows
      .map(e => {
        const posStr = String(e.position);
        const [lng, lat] = posStr
          .replace(/[\[\]\s]/g, '')
          .split(',')
          .map(Number);
        return { ...e, position: [lng, lat] };
      })
      .filter(isCompleteEntreprise);

    res.json(results);
  } catch (err) {
    console.error('BigQuery /search error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
