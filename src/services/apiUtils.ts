import { InseeCompanyData, Coordinates, CompanyCoordinates } from "../types/apiTypes";

// 🌐 Base URL API (local ou production)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://application-map.onrender.com";

// Fonction générique pour gérer les erreurs
const handleError = async (response: Response) => {
  const errorText = await response.text();
  console.error(`Erreur API: ${errorText}`);
  throw new Error(`Erreur lors de la récupération des données: ${response.status} - ${errorText}`);
};

// 🏢 Récupération via INSEE API
export const fetchCompanyBySIREN = async (siren: string): Promise<InseeCompanyData> => {
  const formattedSiren = siren.replace(/\s+/g, "");

  const response = await fetch(`${API_BASE}/api/insee/${formattedSiren}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    await handleError(response);
  }

  return response.json();
};

// 🔍 Récupération via BigQuery : SIREN
export interface BQCompanyData {
  Secteur: string | boolean | null;  // Secteur peut être une chaîne de caractères, un booléen ou null
  Nom: string;
  Latitude: number;
  Longitude: number;
  Adresse: string;
  CodeNAF: string;
  Type: "Recherche";
  Distance?: string;
}

export const fetchCompanyBySIREN_BQ = async (siren: string): Promise<BQCompanyData[]> => {
  const formattedSiren = siren.replace(/\s+/g, "");

  const response = await fetch(`${API_BASE}/api/bigquery/${formattedSiren}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    await handleError(response);
  }

  return response.json();
};

// 🔍 Récupération via BigQuery : activité par NAF + coordonnées
export const fetchCompaniesByNAF_BQ = async (
  naf: string,
  lat: number,
  lng: number,
  radius: number
): Promise<BQCompanyData[]> => {
  const params = new URLSearchParams({
    naf,
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
  });

  const response = await fetch(`${API_BASE}/api/bigquery-activite?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    await handleError(response);
  }

  return response.json();
};

// 📍 Géocoder une adresse via Mapbox
export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  const accessToken = import.meta.env.VITE_MAPBOX_KEY;
  if (!accessToken) {
    throw new Error("Clé API Mapbox manquante");
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erreur Mapbox:", errorText);
    throw new Error(`Erreur API Mapbox (${response.status})`);
  }

  const data = await response.json();
  const features = data.features;

  if (!features || features.length === 0) {
    console.warn("Adresse non trouvée via Mapbox");
    return null;
  }

  const firstFeature = features[0];
  const [longitude, latitude] = firstFeature.center;
  return { latitude, longitude };
};

// 🏭 Géocoder une entreprise par nom (Nominatim)
export const geocodeCompany = async (companyName: string): Promise<CompanyCoordinates | null> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&q=${encodeURIComponent(companyName)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur Nominatim:", errorText);
      throw new Error(`Erreur API Nominatim (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`Entreprise non trouvée: ${companyName}`);
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error("Erreur de géocodage entreprise:", error);
    return null;
  }
};

// 📦 Fonction générique pour effectuer des requêtes GET avec paramètres
const fetchData = async (url: string, params: Record<string, any>): Promise<any> => {
  const queryParams = new URLSearchParams(params);
  const response = await fetch(`${API_BASE}${url}?${queryParams.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    await handleError(response);
  }

  return response.json();
};

// Exemple d'utilisation de fetchData dans d'autres appels
export const fetchCompaniesByNAF = async (naf: string, lat: number, lon: number, radius: number) => {
  return fetchData("/api/bigquery-activite", { naf, lat, lon, radius });
};
