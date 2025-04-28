// 📍 Typage pour la réponse d'une géolocalisation générique (ex: Mapbox)
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// 🏢 Typage simplifié pour les coordonnées retournées par Nominatim
export interface CompanyCoordinates {
  lat: number;
  lon: number;
}

// 🏛️ Typage d'une période d'activité d'une entreprise INSEE
export interface UniteLegalePeriode {
  activitePrincipaleUniteLegale?: string;
  denominationUniteLegale?: string;
  nomUniteLegale?: string;
  dateFin: string | null; // null = période active
}

// 📦 Typage global de l'unité légale (INSEE)
export interface UniteLegale {
  denominationUniteLegale?: string;
  nomUniteLegale?: string;
  periodesUniteLegale: UniteLegalePeriode[];
}

// 🔍 Typage complet pour la réponse d'une recherche SIREN
export interface InseeCompanyData {
  uniteLegale: UniteLegale;
}
