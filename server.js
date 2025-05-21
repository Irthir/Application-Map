// server.js (ES module)
import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Clé API INSEE (à définir dans .env)
const INSEE_API_KEY = process.env.INSEE_API_KEY;
if (!INSEE_API_KEY) console.warn('⚠️ INSEE_API_KEY non défini dans .env');

// GET /api/search?term=...
app.get('/api/search', async (req, res) => {
  const term = req.query.term;
  if (typeof term !== 'string' || !term.trim()) {
    return res.status(400).json({ error: 'Paramètre term manquant' });
  }
  try {
    const url = 'https://api.insee.fr/entreprises/sirene/V3/siren';
    const params = { q: `denominationUniteLegale:*${term}* OR siren:${term}*`, nombre: 10 };
    const { data } = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${INSEE_API_KEY}`, Accept: 'application/json' }
    });
    const etabs = data.unitesLegales || [];
    const results = etabs.map(u => {
      const geo = u.geo_adresse || {};
      return {
        name: u.denominationUniteLegale,
        siren: u.siren,
        codeNAF: u.activitePrincipaleUniteLegale,
        employeesCategory: u.trancheEffectifsUniteLegale || 'Non renseigné',
        address: [geo.numeroVoieEtablissement, geo.typeVoieEtablissement, geo.libelleVoieEtablissement]
          .filter(Boolean).join(' ') + `, ${geo.codePostalEtablissement || ''} ${geo.libelleCommuneEtablissement || ''}`.trim(),
        position: [parseFloat(u.longitudeUniteLegale) || 0, parseFloat(u.latitudeUniteLegale) || 0],
        type: 'Recherche'
      };
    });
    res.json(results);
  } catch (err) {
    console.error('Erreur API INSEE', err);
    res.status(500).json({ error: "Erreur lors de la recherche d'entreprises" });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
