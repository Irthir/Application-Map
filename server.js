// server.js (ES module) - switch to OpenCorporates API for company search
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/**
 * GET /api/search?term=...
 * Uses OpenCorporates public API to search French companies by name/SIREN/address
 */
app.get('/api/search', async (req, res) => {
  const term = (req.query.term || '').trim();
  if (!term) {
    return res.status(400).json({ error: 'Paramètre term manquant' });
  }

  try {
    // Query OpenCorporates: search up to 5 companies in France
    const url = `https://api.opencorporates.com/v0.4/companies/search?jurisdiction_code=fr&q=${encodeURIComponent(term)}&per_page=5`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error('Erreur OpenCorporates', response.status, text);
      return res.status(502).json({ error: 'Erreur externe lors de la recherche' });
    }
    const data = await response.json();
    const companies = data.results.companies || [];

    // Map results
    const results = companies.map((c) => {
      const comp = c.company;
      return {
        name: comp.name || 'N/A',
        siren: comp.company_number || '',
        codeNAF: comp.industry_codes && comp.industry_codes.length ? comp.industry_codes[0].code : '',
        employeesCategory: comp.employee_range || '',
        address: comp.registered_address_in_full || '',
        position: [2.3522, 48.8566], // OpenCorporates doesn't provide geolocation, fallback to Paris
        type: 'Recherche'
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Erreur interne serveur:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
