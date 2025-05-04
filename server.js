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

// Lecture du fichier local de fallback postal
const codePostalData = JSON.parse(fs.readFileSync("./src/data/code-postaux.json", "utf-8"));

// 🔌 Connexion BigQuery
const bigquery = new BigQuery({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
  projectId: "application-map-458717"
});

// 🔐 INSEE token utils
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

//
// 🔍 BIGQUERY - Recherche par activité
//
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
      FROM \`bigquery-public-data.sirene.etablissements\`
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

//
// 🔍 BIGQUERY - Recherche par SIREN
//
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
      FROM \`bigquery-public-data.sirene.etablissements\`
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

//
// 🔎 INSEE - Recherche par activité
//
app.get("/api/insee-activite", async (req, res) => {
  try {
    await ensureToken();
    const { naf, lat, lng, radius, onlyActive = "false", onlyCompanies = "false" } = req.query;
    if (!naf || !lat || !lng || !radius) {
      return res.status(400).json({ error: "Paramètres 'naf', 'lat', 'lng', 'radius' requis." });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);
    const filterActive = onlyActive === "true";
    const filterCompany = onlyCompanies === "true";

    const query = `periode(activitePrincipaleEtablissement:${naf})`;
    const pageSize = 1000;
    let allEtablissements = [];
    let start = 0;

    while (start < 3000) {
      const url = `${API_URL}?q=${encodeURIComponent(query)}&nombre=${pageSize}&debut=${start}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API INSEE (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const etablissements = data.etablissements || [];

      allEtablissements = allEtablissements.concat(
        etablissements.filter(e => {
          if (filterActive && e.etatAdministratifEtablissement !== "A") return false;
          if (filterCompany && parseInt(e.uniteLegale?.categorieJuridiqueUniteLegale || "0") < 2000) return false;
          return true;
        })
      );

      if (etablissements.length < pageSize) break;
      start += pageSize;
    }

    const results = allEtablissements.map((e) => {
      let latWGS, lonWGS;
      const lambertX = parseFloat(e.adresseEtablissement.coordonneeLambertAbscisseEtablissement);
      const lambertY = parseFloat(e.adresseEtablissement.coordonneeLambertOrdonneeEtablissement);

      if (!isNaN(lambertX) && !isNaN(lambertY)) {
        [latWGS, lonWGS] = LambertToWGS84(lambertX, lambertY);
      } else {
        const fallback = codePostalData.find(cp => cp.Code_postal === e.adresseEtablissement.codePostalEtablissement);
        if (!fallback) return null;
        latWGS = fallback.latitude;
        lonWGS = fallback.longitude;
      }

      const distance = haversineDistance(latNum, lngNum, latWGS, lonWGS);
      if (isNaN(distance) || distance > radiusNum) return null;

      return {
        Nom: e.uniteLegale?.denominationUniteLegale || e.uniteLegale?.nomUniteLegale || "Entreprise",
        Latitude: latWGS,
        Longitude: lonWGS,
        Adresse: `${e.adresseEtablissement.numeroVoieEtablissement || ""} ${e.adresseEtablissement.typeVoieEtablissement || ""} ${e.adresseEtablissement.libelleVoieEtablissement || ""}, ${e.adresseEtablissement.codePostalEtablissement} ${e.adresseEtablissement.libelleCommuneEtablissement}`.trim(),
        Secteur: e.periodesEtablissement?.[0]?.activitePrincipaleEtablissement || "",
        CodeNAF: e.periodesEtablissement?.[0]?.activitePrincipaleEtablissement || "",
        Type: "Recherche",
      };
    }).filter(Boolean);

    res.json(results);
  } catch (error) {
    console.error("💥 Erreur API INSEE :", error);
    res.status(500).json({ error: error.message || "Erreur interne serveur" });
  }
});

//
// 🔎 INSEE - Recherche par SIREN
//
app.get("/api/insee/:siren", async (req, res) => {
  try {
    await ensureToken();
    const { siren } = req.params;
    if (!siren || !/^\d{9}$/.test(siren)) {
      return res.status(400).json({ error: "SIREN invalide" });
    }

    const url = `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur API INSEE (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("💥 Erreur INSEE SIREN :", error);
    res.status(500).json({ error: error.message || "Erreur serveur" });
  }
});

app.get("/ping", (req, res) => {
  res.send("pong 🏓");
});

//
// 🚀 Lancement du serveur
//
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur API en ligne sur http://localhost:${PORT}`));
