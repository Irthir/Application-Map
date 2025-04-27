// Typage d'une position retournée par geocoding
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Typage pour une réponse simple de géocodage via Nominatim (geocodeCompany)
export interface CompanyCoordinates {
  lat: number;
  lon: number;
}

// Typage de l'entreprise retournée par INSEE (fetchCompanyBySIREN)
export interface InseeCompanyData {
  uniteLegale?: {
    denominationUniteLegale?: string;
    nomUniteLegale?: string;
    periodesUniteLegale?: {
      activitePrincipaleUniteLegale?: string;
      denominationUniteLegale?: string;
      nomUniteLegale?: string;
      dateFin: string | null;
    }[];
  };
}
