// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { LambertToWGS84 } from "./utils/lambertToWGS84.js";
import { BigQuery } from "@google-cloud/bigquery";

dotenv.config();
const app = express();

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

const codePostalData = JSON.parse(fs.readFileSync("./src/data/code-postaux.json", "utf-8"));

const bigquery = new BigQuery({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
  projectId: "application-map-458717"
});

const TOKEN_URL = "https://api.insee.fr/token";
const API_URL = "https://api.insee.fr/entreprises/sirene/V3.11/siret";
const INSEE_KEY = process.env.INSEE_API_KEY;
const INSEE_SECRET = process.env.INSEE_API_SECRET;
let token = "";
let tokenExpiry = 0;

const getToken = async () => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${INSEE_KEY}:${INSEE_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`Erreur token INSEE: ${response.statusText}`);
  const data = await response.json();
  token = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  console.log("✅ Token INSEE récupéré");
};

const ensureToken = async () => {
  if (!token || Date.now() >= tokenExpiry) {
    console.log("🔄 Rafraîchissement token...");
    await getToken();
  }
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
        denominationunitelegale AS Nom,
        activiteprincipaleetablissement AS CodeNAF,
        coordonneelambertabscisseetablissement AS x,
        coordonneelambertordonneeetablissement AS y,
        codepostaletablissement,
        libellecommuneetablissement
      FROM \`application-map-458717.sirene_data.etablissements\`
      WHERE activiteprincipaleetablissement = @naf
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
        Adresse: `${row.codepostaletablissement || ""} ${row.libellecommuneetablissement || ""}`.trim(),
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

app.get("/api/bigquery/:siren", async (req, res) => {
  const { siren } = req.params;
  if (!siren || !/^\d{9}$/.test(siren)) {
    return res.status(400).json({ error: "SIREN invalide" });
  }

  try {
    const query = `
      SELECT
        denominationunitelegale AS Nom,
        activiteprincipaleetablissement AS CodeNAF,
        coordonneelambertabscisseetablissement AS x,
        coordonneelambertordonneeetablissement AS y,
        codepostaletablissement,
        libellecommuneetablissement
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
      Adresse: `${row.codepostaletablissement || ""} ${row.libellecommuneetablissement || ""}`.trim(),
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
