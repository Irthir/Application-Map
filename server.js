import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const INSEE_API_URL = "https://api.insee.fr/entreprises/sirene/V3.11/siren";
const INSEE_TOKEN_URL = "https://api.insee.fr/token";
const INSEE_KEY = process.env.INSEE_API_KEY;
const INSEE_SECRET = process.env.INSEE_API_SECRET;

let token = "";
let tokenExpiry = 0; // Timestamp d'expiration du token

// 🔑 Fonction pour récupérer un token OAuth
const getToken = async () => {
  try {
    console.log("🔄 Récupération du token INSEE...");

    const response = await fetch(INSEE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${INSEE_KEY}:${INSEE_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de l'obtention du token: ${response.statusText}`);
    }

    const data = await response.json();
    token = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000; // Stocker l'expiration en millisecondes

    console.log("✅ Token INSEE récupéré avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du token:", error.message);
  }
};

// 🔍 Vérifier si le token est toujours valide avant chaque requête
const ensureValidToken = async () => {
  if (!token || Date.now() >= tokenExpiry) {
    console.log("⚠️ Token expiré ou inexistant, récupération d'un nouveau...");
    await getToken();
  }
};

// 📌 Endpoint proxy pour récupérer des infos INSEE via un SIREN
app.get("/api/insee/:siren", async (req, res) => {
  try {
    await ensureValidToken();

    const { siren } = req.params;
    const url = `${INSEE_API_URL}/${siren}`;

    console.log(`📡 Requête à l'INSEE: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      console.log("🔄 Token invalide. Récupération d'un nouveau token...");
      await getToken(); // Reprendre un nouveau token et réessayer
      return res.redirect(`/api/insee/${siren}`);
    }

    if (!response.ok) {
      throw new Error(`❌ Erreur API INSEE: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.uniteLegale) {
      throw new Error("⚠️ Aucune donnée trouvée pour ce SIREN.");
    }

    const uniteLegale = data.uniteLegale;
    const periodeActuelle = uniteLegale.periodesUniteLegale[0];

    const resultat = {
      siren: uniteLegale.siren,
      denomination: periodeActuelle.denominationUniteLegale,
      activitePrincipale: periodeActuelle.activitePrincipaleUniteLegale,
      etatAdministratif: periodeActuelle.etatAdministratifUniteLegale,
      categorieJuridique: periodeActuelle.categorieJuridiqueUniteLegale,
      derniereMiseAJour: uniteLegale.dateDernierTraitementUniteLegale,
    };

    console.log("✅ Données reçues:", resultat);
    res.json(resultat);
  } catch (error) {
    console.error("💥 Erreur:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Serveur proxy prêt sur http://localhost:${PORT}`));
