// server.js (ES module) - support search by name/SIREN and address via INSEE SIRENE API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const INSEE_API_KEY = process.env.INSEE_API_KEY;
if (!INSEE_API_KEY) console.warn('⚠️ INSEE_API_KEY non défini dans .env');

/**
 * GET /api/search?term=...
 * Search both business names/SIREN and addresses
 */
app.get('/api/search', async (req, res) => {
  const term = (typeof req.query.term === 'string' ? req.query.term : '').trim();
  if (!term) return res.status(400).json({ error: 'Paramètre term manquant' });

  const headers = {
    Authorization: `Bearer ${INSEE_API_KEY}`,
    Accept: 'application/json'
  };

  try {
    // Build common params
    const qSiren = `denominationUniteLegale:*${term}* OR siren:${term}*`;
    const urlSiren = `https://api.insee.fr/entreprises/sirene/V3/siren?${new URLSearchParams({ q: qSiren, nombre: '5' })}`;

    const qEtab = `geo_adresseEtablissement:*${term}* OR libelleCommuneEtablissement:*${term}*`;
    const urlEtab = `https://api.insee.fr/entreprises/sirene/V3/etablissements?${new URLSearchParams({ q: qEtab, nombre: '5' })}`;

    // Fetch both in parallel
    const [respSiren, respEtab] = await Promise.all([
      fetch(urlSiren, { headers }),
      fetch(urlEtab,  { headers })
    ]);

    if (!respSiren.ok || !respEtab.ok) {
      const msg = `Erreur INSEE: ${respSiren.status}/${respEtab.status}`;
      console.error(msg);
      return res.status(500).json({ error: 'Erreur externe lors de la recherche' });
    }

    const dataSiren = await respSiren.json();
    const dataEtab  = await respEtab.json();

    // Map legal units
    const unitResults = (dataSiren.unitesLegales || []).map((u) => ({
      name: u.denominationUniteLegale,
      siren: u.siren,
      codeNAF: u.activitePrincipaleUniteLegale,
      employeesCategory: u.trancheEffectifsUniteLegale || 'Non renseigné',
      address: u.geo_adresse ? `${u.geo_adresse.numeroVoieEtablissement || ''} ${u.geo_adresse.libelleVoieEtablissement || ''}, ${u.geo_adresse.codePostalEtablissement} ${u.geo_adresse.libelleCommuneEtablissement}`.trim() : '',
      position: [
        parseFloat(u.longitudeUniteLegale) || 0,
        parseFloat(u.latitudeUniteLegale)  || 0
      ],
      type: 'Recherche'
    }));

    // Map establishments
    const etabResults = (dataEtab.etablissements || []).map((e) => ({
      name: e.uniteLegale.denominationUniteLegale,
      siren: e.uniteLegale.siren,
      codeNAF: e.uniteLegale.activitePrincipaleUniteLegale,
      employeesCategory: e.uniteLegale.trancheEffectifsUniteLegale || 'Non renseigné',
      address: `${e.geo_adresse.numeroVoieEtablissement || ''} ${e.geo_adresse.libelleVoieEtablissement || ''}, ${e.geo_adresse.codePostalEtablissement} ${e.geo_adresse.libelleCommuneEtablissement}`.trim(),
      position: [
        parseFloat(e.longitudeEtablissement) || 0,
        parseFloat(e.latitudeEtablissement)  || 0
      ],
      type: 'Prospect'
    }));

    // Combine and dedupe by siren
    const combined = [...unitResults, ...etabResults];
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
