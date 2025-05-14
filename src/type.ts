// type.ts

export interface DataPoint {
  Nom: string;
  Latitude: number;
  Longitude: number;
  Adresse?: string;
  Secteur?: string;
  CodeNAF?: string;
  SIREN?: string;
  Type: 'Recherche' | 'Client' | 'Prospect';
  Distance?: number;  // maintenant un nombre
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BQCompanyData {
  Nom: string;
  Secteur: string | boolean | null;
  Latitude: number;
  Longitude: number;
  Adresse?: string;
  CodeNAF?: string;
  Type: 'Recherche';
  Distance?: number;
}
