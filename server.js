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
  projectId: process.env.GCP_PROJECT_ID,  // ou + automatique via GOOGLE_APPLICATION_CREDENTIALS
});

// Nom complet de votre table
const TABLE_ID = '`application-map-458717.sirene_data.merged_sirene`';

// GET /api/all — renvoie toutes les entreprises
app.get('/api/all', async (_req, res) => {
  try {
    const query = `
      SELECT siren, name, codeNAF, employeesCategory, address, position
      FROM ${TABLE_ID}
    `;
    const [job] = await bq.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    res.json(rows);
  } catch (err) {
    console.error('BigQuery /all error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

// GET /api/search?term=… — renvoie jusqu’à 5 suggestions
app.get('/api/search', async (req, res) => {
  const termRaw = ((req.query.term || '')).trim().toLowerCase();
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
    res.json(rows);
  } catch (err) {
    console.error('BigQuery /search error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
