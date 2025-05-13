// type.ts

export interface DataPoint {
  Nom: string;
  Latitude: number;
  Longitude: number;
  Adresse: string;
  Secteur: string;
  CodeNAF: string;
  Type: string;
  Distance?: string; // Optionnel
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Pour une meilleure organisation des résultats retournés par BigQuery
export interface BQCompanyData {
  Nom: string;
  Secteur: string | boolean | null;  // Secteur peut être une chaîne, un booléen ou null
  Latitude: number;
  Longitude: number;
  Adresse: string;
  CodeNAF: string;
  Type: "Recherche"; // Peut être personnalisé si nécessaire
  Distance?: string;
}
