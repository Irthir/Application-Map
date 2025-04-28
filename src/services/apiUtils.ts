import { InseeCompanyData, Coordinates, CompanyCoordinates } from "../types/apiTypes";

// 🏢 Récupérer les données INSEE via SIREN
export const fetchCompanyBySIREN = async (siren: string): Promise<InseeCompanyData> => {
  const formattedSiren = siren.replace(/\s+/g, "");

  const response = await fetch(`https://application-map.onrender.com/api/insee/${formattedSiren}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erreur INSEE :", errorText);
    throw new Error("Erreur lors de la récupération des données INSEE");
  }

  return response.json();
};

// 📍 Géocoder une adresse via Mapbox
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
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
  const firstFeature = data.features?.[0];

  if (!firstFeature || !Array.isArray(firstFeature.center)) {
    throw new Error("Adresse non trouvée via Mapbox");
  }

  const [longitude, latitude] = firstFeature.center;
  return { latitude, longitude };
};

// 🏭 Géocoder une entreprise par son nom avec Nominatim
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
