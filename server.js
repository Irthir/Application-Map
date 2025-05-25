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

// Nom complet de votre table
const TABLE_ID = '`application-map-458717.sirene_data.merged_sirene`';

// Vérifie que l’entreprise a bien tous les champs requis
function isCompleteEntreprise(e) {
  if (!e.name || typeof e.name !== 'string' || !e.name.trim()) return false;
  if (!e.employeesCategory || typeof e.employeesCategory !== 'string') return false;
  if (
    !e.position ||
    !Array.isArray(e.position) ||
    e.position.length !== 2 ||
    typeof e.position[0] !== 'number' ||
    typeof e.position[1] !== 'number' ||
    Number.isNaN(e.position[0]) ||
    Number.isNaN(e.position[1])
  ) {
    return false;
  }
  return true;
}

// GET /api/all — renvoie toutes les entreprises complètes
app.get('/api/all', async (_req, res) => {
  try {
    const query = `
      SELECT
        siren,
        name,
        codeNAF,
        employeesCategory,
        address,
        ST_X(position) AS lng,
        ST_Y(position) AS lat
      FROM ${TABLE_ID}
    `;
    const [job] = await bq.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    const filtered = rows
      .map(r => ({
        siren: r.siren,
        name: r.name,
        codeNAF: r.codeNAF,
        employeesCategory: r.employeesCategory,
        address: r.address,
        position: [Number(r.lng), Number(r.lat)]
      }))
      .filter(isCompleteEntreprise);

    res.json(filtered);
  } catch (err) {
    console.error('BigQuery /all error:', err);
    res.status(500).json({ error: 'Erreur interne BigQuery' });
  }
});

// GET /api/search?term=… — renvoie jusqu’à 5 suggestions (nom, SIREN ou adresse)
app.get('/api/search', async (req, res) => {
  const termRaw = String(req.query.term || '').trim().toLowerCase();
  if (!termRaw) return res.json([]);

  try {
    const query = `
      SELECT
        siren,
        name,
        codeNAF,
        employeesCategory,
        address,
        ST_X(position) AS lng,
        ST_Y(position) AS lat
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

    const results = rows
      .map(r => ({
        siren: r.siren,
        name: r.name,
        codeNAF: r.codeNAF,
        employeesCategory: r.employeesCategory,
        address: r.address,
        position: [Number(r.lng), Number(r.lat)]
      }))
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
