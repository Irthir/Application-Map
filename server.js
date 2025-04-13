import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

  if (!response.ok) {
    throw new Error(`Erreur token INSEE: ${response.statusText}`);
  }

  const data = await response.json();
  token = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  console.log("✅ Token INSEE mis à jour");
};

const ensureToken = async () => {
  if (!token || Date.now() >= tokenExpiry) {
    console.log("🔄 Récupération du token INSEE...");
    await getToken();
  }
};

app.get("/api/insee-activite", async (req, res) => {
  try {
    await ensureToken();

    const { naf } = req.query;
    if (!naf) {
      return res.status(400).json({ error: "Paramètre 'naf' requis." });
    }

    const query = `activitePrincipaleEtablissement:${naf}`;
    const url = `${API_URL}?q=${encodeURIComponent(query)}&nombre=1000`;

    console.log("🔍 URL finale appelée à l'API INSEE :", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("💥 Erreur activité INSEE :", errorText);
      throw new Error(`Erreur API INSEE: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const etablissements = data.etablissements || [];

    const formatted = etablissements
      .filter((e) => e.coordonneesEtablissement)
      .map((e) => ({
        Nom: e.uniteLegale?.denominationUniteLegale || e.uniteLegale?.nomUniteLegale || "Entreprise",
        Latitude: parseFloat(e.coordonneesEtablissement.latitude),
        Longitude: parseFloat(e.coordonneesEtablissement.longitude),
        Type: "Recherche",
      }));

    res.json(formatted);
  } catch (error) {
    console.error("💥 Erreur activité INSEE :", error.message);
    res.status(500).json({ error: error.message });
  }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Serveur en écoute sur http://localhost:${PORT}`));
