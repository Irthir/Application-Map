// server.js (ES module) - using INSEE SIRENE V3 API with OAuth2 (client credentials)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());

const INSEE_API_KEY = process.env.INSEE_API_KEY;
const INSEE_API_SECRET = process.env.INSEE_API_SECRET;
if (!INSEE_API_KEY || !INSEE_API_SECRET) {
  console.warn('⚠️ INSEE_API_KEY et/ou INSEE_API_SECRET non définis dans .env');
}

let inseeToken = null;
let tokenExpiry = 0;

// Fetch OAuth2 token from INSEE
async function fetchInseeToken() {
  if (inseeToken && Date.now() < tokenExpiry - 60000) {
    return inseeToken;
  }
  const creds = Buffer.from(`${INSEE_API_KEY}:${INSEE_API_SECRET}`).toString('base64');
  const resp = await fetch('https://api.insee.fr/token?grant_type=client_credentials', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Insee token error ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  inseeToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return inseeToken;
}

/**
 * GET /api/search?term=...
 * Search units and establishments via INSEE SIRENE V3 API
 */
app.get('/api/search', async (req, res) => {
  const term = (req.query.term || '').trim();
  if (!term) return res.status(400).json({ error: 'Paramètre term manquant' });

  try {
    const token = await fetchInseeToken();
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    const qUnits = `denominationUniteLegale:*${term}* OR siren:${term}*`;
    const urlUnits = `https://api.insee.fr/entreprises/sirene/V3/siren?q=${encodeURIComponent(qUnits)}&nombre=5`;

    const qEtabs = `geo_adresseEtablissement:*${term}* OR libelleCommuneEtablissement:*${term}*`;
    const urlEtabs = `https://api.insee.fr/entreprises/sirene/V3/etablissements?q=${encodeURIComponent(qEtabs)}&nombre=5`;

    const [respUnits, respEtabs] = await Promise.all([
      fetch(urlUnits, { headers }),
      fetch(urlEtabs, { headers })
    ]);

    if (!respUnits.ok || !respEtabs.ok) {
      console.error('Erreur SIRENE API', respUnits.status, respEtabs.status);
      return res.status(502).json({ error: 'Erreur externe lors de la recherche' });
    }

    const dataUnits = await respUnits.json();
    const dataEtabs = await respEtabs.json();

    const units = (dataUnits.unitesLegales || []).map((u) => ({
      name: u.denominationUniteLegale,
      siren: u.siren,
      codeNAF: u.activitePrincipaleUniteLegale,
      employeesCategory: u.trancheEffectifSalarieUniteLegale || '',
      address: '',
      position: [2.3522, 48.8566],
      type: 'Recherche'
    }));

    const etabs = (dataEtabs.etablissements || []).map((e) => ({
      name: e.uniteLegale.denominationUniteLegale,
      siren: e.uniteLegale.siren,
      codeNAF: e.uniteLegale.activitePrincipaleUniteLegale,
      employeesCategory: e.uniteLegale.trancheEffectifSalarieUniteLegale || '',
      address: e.geo_adresseEtablissement?.label || '',
      position: [e.longitudeEtablissement || 2.3522, e.latitudeEtablissement || 48.8566],
      type: 'Prospect'
    }));

    const combined = [...units, ...etabs];
    const seen = new Set();
    const results = combined.filter(item => {
      if (seen.has(item.siren)) return false;
      seen.add(item.siren);
      return true;
    });

    res.json(results);
  } catch (err) {
    console.error('Erreur interne serveur:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
