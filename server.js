// server.js (ES module) - using entreprise.api.gouv.fr Public API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/**
 * GET /api/search?term=...
 * Searches companies by name/SIREN/address via entreprise.api.gouv.fr Public API
 */
app.get('/api/search', async (req, res) => {
  const term = String(req.query.term || '').trim();
  if (!term) {
    return res.status(400).json({ error: 'Paramètre term manquant' });
  }

  try {
    // Query the public API: returns up to 5 results
    const apiUrl = `https://entreprise.api.gouv.fr/v3/search?query=${encodeURIComponent(term)}&per_page=5`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const txt = await response.text();
      console.error('Erreur API gov.fr', response.status, txt);
      return res.status(502).json({ error: 'Erreur externe lors de la recherche' });
    }
    const data = await response.json();

    // Map into uniform structure
    const results = (data.searchResults || []).map((item) => {
      const unite = item.uniteLegale;
      const etab = item.etablissement;
      return {
        name: unite?.denominationUniteLegale || 'N/A',
        siren: unite?.siren || '',
        codeNAF: unite?.activitePrincipaleUniteLegale || '',
        employeesCategory: unite?.trancheEffectifsUniteLegale || 'Non renseigné',
        address: etab?.geo_adresse?.label || unite?.adresseEtablissement?.label || '',
        position: etab?.geo_adresse?.coordinates || [2.3522, 48.8566],
        type: 'Recherche',
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Erreur interne serveur:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
