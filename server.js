// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Clé API INSEE (à définir dans .env)
const INSEE_API_KEY = process.env.INSEE_API_KEY;
if (!INSEE_API_KEY) {
  console.warn('⚠️  INSEE_API_KEY non défini dans .env');
}

// Endpoint de recherche d'entreprises
// GET /api/search?term=...   
app.get('/api/search', async (req, res) => {
  const term = req.query.term;
  if (!term) return res.status(400).json({ error: 'Paramètre term manquant' });

  try {
    // Recherche via l'API Sirene V3
    const url = `https://api.insee.fr/entreprises/sirene/V3/siren?q=denominationUniteLegale:*${encodeURIComponent(term)}* OR siren:${encodeURIComponent(term)}*&nombre=10`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${INSEE_API_KEY}`,
        Accept: 'application/json'
      }
    });

    const etabs = response.data.unitesLegales || [];
    const results = etabs.map(u => {
      const geo = u.geo_adresse || {};
      return {
        name: u.denominationUniteLegale,
        siren: u.siren,
        codeNAF: u.activitePrincipaleUniteLegale,
        employeesCategory: u.trancheEffectifsUniteLegale || 'Non renseigné',
        address: `${geo.numeroVoieEtablissement || ''} ${geo.typeVoieEtablissement || ''} ${geo.libelleVoieEtablissement || ''}, ${geo.codePostalEtablissement || ''} ${geo.libelleCommuneEtablissement || ''}`.trim(),
        position: [
          parseFloat(u.longitudeUniteLegale) || 0,
          parseFloat(u.latitudeUniteLegale)  || 0
        ],
        type: 'Recherche'
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Erreur API INSEE', err.response?.data || err.message);
    res.status(500).json({ error: 'Erreur lors de la recherche d\'entreprises' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
