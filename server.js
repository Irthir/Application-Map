import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { LambertToWGS84 } from "./utils/lambertToWGS84.js";

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

const TOKEN_URL = "https://api.insee.fr/token";
const API_URL = "https://api.insee.fr/entreprises/sirene/V3.11/siret";
const INSEE_KEY = process.env.INSEE_API_KEY;
const INSEE_SECRET = process.env.INSEE_API_SECRET;

let token = "";
let tokenExpiry = 0;

const codePostalData = JSON.parse(fs.readFileSync("./src/data/code-postaux.json", "utf-8"));

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

    while (start < 3000) { // 🔥 Limite à 3000 pour éviter surcharge
      const url = `${API_URL}?q=${encodeURIComponent(query)}&nombre=${pageSize}&debut=${start}`;
      console.log("🔍 Appel API INSEE :", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur INSEE:", errorText);
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

    console.log(`✨ Total établissements chargés: ${allEtablissements.length}`);

    const results = allEtablissements.map((e) => {
      let latWGS, lonWGS;

      const lambertX = parseFloat(e.adresseEtablissement.coordonneeLambertAbscisseEtablissement);
      const lambertY = parseFloat(e.adresseEtablissement.coordonneeLambertOrdonneeEtablissement);

      if (!isNaN(lambertX) && !isNaN(lambertY)) {
        [latWGS, lonWGS] = LambertToWGS84(lambertX, lambertY);
      } else {
        const fallback = codePostalData.find(cp => cp.Code_postal === e.adresseEtablissement.codePostalEtablissement);
        if (fallback) {
          latWGS = fallback.latitude;
          lonWGS = fallback.longitude;
        } else {
          console.warn("⚠️ Coordonnées manquantes pour:", e.uniteLegale?.denominationUniteLegale || e.uniteLegale?.nomUniteLegale);
          return null;
        }
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

    console.log(`✅ Résultats filtrés : ${results.length}`);
    res.json(results);

  } catch (error) {
    console.error("💥 Erreur serveur:", error);
    res.status(500).json({ error: error.message || "Erreur interne serveur" });
  }
});

// 🔎 Récupération entreprise par SIREN
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
    console.error("💥 Erreur SIREN:", error);
    res.status(500).json({ error: error.message || "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur API en ligne sur http://localhost:${PORT}`));
