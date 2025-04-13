// api/insee-activite.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();
let getToken = () => "";

export const injectTokenGetter = (tokenGetterFn) => {
  getToken = tokenGetterFn;
};

// 🌍 Haversine distance (en km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Rayon terrestre}

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

router.get("/", async (req, res) => {
  try {
    const token = await getToken();

    const { naf, lat, lon, distance = 10000 } = req.query;
    const maxPages = 5;
    const perPage = 100;
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const maxDistance = parseFloat(distance) / 1000;

    let results = [];

    for (let page = 1; page <= maxPages; page++) {
      const url = `https://api.insee.fr/entreprises/sirene/V3.11/etablissements?activitePrincipale=${naf}&nombre=${perPage}&page=${page}`;

      console.log("🔍 URL API INSEE appelée :", apiUrl);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) break;

      const data = await response.json();
      const etablissements = data.etablissements || [];

      const geoFiltered = etablissements
        .filter((e) => e.coordonneesEtablissement)
        .map((e) => {
          const latE = parseFloat(e.coordonneesEtablissement.latitude);
          const lonE = parseFloat(e.coordonneesEtablissement.longitude);
          const d = haversineDistance(parsedLat, parsedLon, latE, lonE);

          return {
            Nom:
              e.uniteLegale?.denominationUniteLegale ||
              e.uniteLegale?.nomUniteLegale ||
              "Entreprise",
            Latitude: latE,
            Longitude: lonE,
            Type: "Recherche",
            Distance: d,
          };
        })
        .filter((e) => e.Distance <= maxDistance);

      results.push(...geoFiltered);

      if (!data.pagination || data.pagination.page === data.pagination.total_pages) {
        break;
      }
    }

    res.json(results);
  } catch (error) {
    console.error("💥 Erreur activité INSEE :", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
