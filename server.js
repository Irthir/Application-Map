// server.js (ES module) - enhanced: SIREN, name, address cases using INSEE SIRENE V3 API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

// Activer CORS pour toutes les origines
app.use(cors({ origin: '*' }));
// Gérer les prévol CORS
app.options('*', cors({ origin: '*' }));
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
  if (inseeToken && Date.now() < tokenExpiry - 60000) return inseeToken;
  const creds = Buffer.from(`${INSEE_API_KEY}:${INSEE_API_SECRET}`).toString('base64');
  const resp = await fetch('https://api.insee.fr/token?grant_type=client_credentials', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!resp.ok) throw new Error(`Token error ${resp.status}`);
  const data = await resp.json();
  inseeToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return inseeToken;
}

/**
 * GET /api/search?term=...
 * Cases:
 * - SIREN (9 digits): direct fetch unit and establishments
 * - Name: find unit by name, then fetch details by siren
 * - Address: find establishment by address, then fetch details by siren
 */
app.get('/api/search', async (req, res) => {
  const raw = (typeof req.query.term === 'string' ? req.query.term : '').trim();
  if (!raw) return res.status(400).json({ error: 'Paramètre term manquant' });

  try {
    const token = await fetchInseeToken();
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    let sirenToFetch = null;

    // 1) SIREN case
    if (/^\d{9}$/.test(raw)) {
      sirenToFetch = raw;
    } else {
      // 2) Name case: search unites_legales via /siren
      const nameQ = `denominationUniteLegale:*${raw}*`;
      const respName = await fetch(
        `https://api.insee.fr/entreprises/sirene/V3/siren?q=${encodeURIComponent(nameQ)}&nombre=1`,
        { headers }
      );
      if (respName.ok) {
        const d1 = await respName.json();
        const u = d1.unitesLegales?.[0];
        if (u?.siren) sirenToFetch = u.siren;
      }
      // 3) Address fallback: if no siren yet
      if (!sirenToFetch) {
        const addrQ = `geo_adresseEtablissement:*${raw}*`;
        const respAddr = await fetch(
          `https://api.insee.fr/entreprises/sirene/V3/etablissements?q=${encodeURIComponent(addrQ)}&nombre=1`,
          { headers }
        );
        if (respAddr.ok) {
          const d2 = await respAddr.json();
          const e = d2.etablissements?.[0];
          if (e?.uniteLegale?.siren) sirenToFetch = e.uniteLegale.siren;
        }
      }
    }

    if (!sirenToFetch) {
      return res.json([]); // aucun résultat
    }

    // Fetch unit details by siren
    const respDetail = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3/siren?q=siren:${sirenToFetch}&nombre=1`,
      { headers }
    );
    if (!respDetail.ok) {
      console.error('Detail fetch error', respDetail.status);
      return res.status(502).json({ error: 'Erreur externe sur détails' });
    }
    const detData = await respDetail.json();
    const unit = detData.unitesLegales?.[0];
    if (!unit) return res.json([]);

    // Optionally fetch establishments for radius etc.

    // Return single result as array
    return res.json([{
      name: unit.denominationUniteLegale,
      siren: unit.siren,
      codeNAF: unit.activitePrincipaleUniteLegale,
      employeesCategory: unit.trancheEffectifSalarieUniteLegale || '',
      address: '',
      position: [2.3522, 48.8566],
      type: 'Recherche'
    }]);
  } catch (err) {
    console.error('Erreur interne serveur:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
