import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { LambertToWGS84 } from "./utils/lambertToWGS84.js";
import { BigQuery } from "@google-cloud/bigquery";

dotenv.config();
const app = express();

// Autorisations CORS
const allowedOrigins = ["https://irthir.github.io", "http://localhost:5173"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));
app.use(express.json());

// Lecture code postal fallback
const codePostalData = JSON.parse(fs.readFileSync("./src/data/code-postaux.json", "utf-8"));

// Connexion BigQuery
const bigquery = new BigQuery({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
  projectId: "application-map-458717"
});

// Distance Haversine
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// 🔍 Recherche par activité (depuis ton dataset local)
app.get("/api/bigquery-activite", async (req, res) => {
  const { naf, lat, lng, radius } = req.query;
  if (!naf || !lat || !lng || !radius) {
    return res.status(400).json({ error: "Paramètres 'naf', 'lat', 'lng', 'radius' requis." });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseFloat(radius);

  try {
    const query = `
      SELECT
        denominationUsuelleEtablissement AS Nom,
        activitePrincipaleEtablissement AS CodeNAF,
        coordonneeLambertAbscisseEtablissement AS x,
        coordonneeLambertOrdonneeEtablissement AS y,
        codePostalEtablissement,
        libelleCommuneEtablissement
      FROM \`application-map-458717.sirene_data.etablissements\`
      WHERE activitePrincipaleEtablissement = @naf
      LIMIT 3000
    `;

    const options = {
      query,
      params: { naf },
      location: "EU",
    };

    const [rows] = await bigquery.query(options);

    const results = rows.map(row => {
      const lambertX = parseFloat(row.x);
      const lambertY = parseFloat(row.y);
      if (isNaN(lambertX) || isNaN(lambertY)) return null;

      const [latitude, longitude] = LambertToWGS84(lambertX, lambertY);
      const distance = haversineDistance(latNum, lngNum, latitude, longitude);
      if (isNaN(distance) || distance > radiusNum) return null;

      return {
        Nom: row.Nom || "Entreprise",
        Latitude: latitude,
        Longitude: longitude,
        Adresse: `${row.codePostalEtablissement || ""} ${row.libelleCommuneEtablissement || ""}`.trim(),
        CodeNAF: row.CodeNAF,
        Type: "Recherche",
        Distance: distance.toFixed(2),
      };
    }).filter(Boolean);

    res.json(results);
  } catch (error) {
    console.error("💥 Erreur BigQuery :", error);
    res.status(500).json({ error: "Erreur BigQuery" });
  }
});

// 🔍 Recherche par SIREN (depuis ton dataset local)
app.get("/api/bigquery/:siren", async (req, res) => {
  const { siren } = req.params;
  if (!siren || !/^\d{9}$/.test(siren)) {
    return res.status(400).json({ error: "SIREN invalide" });
  }

  try {
    const query = `
      SELECT
        denominationUsuelleEtablissement AS Nom,
        activitePrincipaleEtablissement AS CodeNAF,
        coordonneeLambertAbscisseEtablissement AS x,
        coordonneeLambertOrdonneeEtablissement AS y,
        codePostalEtablissement,
        libelleCommuneEtablissement
      FROM \`application-map-458717.sirene_data.etablissements\`
      WHERE siren = @siren
      LIMIT 1
    `;

    const options = {
      query,
      params: { siren },
      location: "EU",
    };

    const [rows] = await bigquery.query(options);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entreprise non trouvée dans BigQuery" });
    }

    const row = rows[0];
    const lambertX = parseFloat(row.x);
    const lambertY = parseFloat(row.y);

    if (isNaN(lambertX) || isNaN(lambertY)) {
      return res.status(400).json({ error: "Coordonnées manquantes" });
    }

    const [latitude, longitude] = LambertToWGS84(lambertX, lambertY);

    res.json([{
      Nom: row.Nom || "Entreprise",
      Latitude: latitude,
      Longitude: longitude,
      Adresse: `${row.codePostalEtablissement || ""} ${row.libelleCommuneEtablissement || ""}`.trim(),
      CodeNAF: row.CodeNAF,
      Type: "Recherche",
    }]);
  } catch (error) {
    console.error("💥 Erreur BigQuery SIREN :", error);
    res.status(500).json({ error: "Erreur BigQuery" });
  }
});

app.get("/ping", (req, res) => {
  res.send("pong 🏓");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur API en ligne sur http://localhost:${PORT}`));
