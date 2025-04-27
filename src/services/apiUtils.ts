// src/services/apiUtils.ts corrigé et typé proprement

import { InseeCompanyData, Coordinates, CompanyCoordinates } from "../types/apiTypes";

// Appel de l'API pour obtenir les données INSEE à partir d'un SIREN
export const fetchCompanyBySIREN = async (siren: string): Promise<InseeCompanyData> => {
  const formattedSiren = siren.replace(/\s+/g, "");

  const response = await fetch(`https://application-map.onrender.com/api/insee/${formattedSiren}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Erreur lors de la récupération des données INSEE");
  }

  return response.json();
};

// Géocoder une adresse avec Mapbox
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${import.meta.env.VITE_MAPBOX_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Erreur API Mapbox (${response.status})`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error("Adresse non trouvée");
  }

  const [longitude, latitude] = data.features[0].center;
  return { latitude, longitude };
};

// Géocoder une entreprise par son nom avec Nominatim
export const geocodeCompany = async (companyName: string): Promise<CompanyCoordinates | null> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(companyName)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      throw new Error("Entreprise non trouvée");
    }

    if (!response.ok) {
      throw new Error(`Erreur API Nominatim (${response.status})`);
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
