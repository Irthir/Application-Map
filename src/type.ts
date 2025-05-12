export interface DataPoint {
  Nom: string;
  Latitude: number;
  Longitude: number;
  Adresse: string;
  Secteur: string;
  CodeNAF: string;
  Type: string;
  Distance?: string; // Ajout du champ Distance, il est optionnel
}
