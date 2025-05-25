export enum EntrepriseType {
  Recherche = 'Recherche',
  Prospect  = 'Prospect',
  Client    = 'Client',
}

export type EmployeesCategory = '1-9' | '10-49' | '50-99' | '100+';

// Mapping des catégories d'effectifs selon le type d'entreprise
export const EmployeesCategoriesByType: Record<EntrepriseType, EmployeesCategory[]> = {
  [EntrepriseType.Recherche]: ['1-9', '10-49', '50-99', '100+'],
  [EntrepriseType.Prospect]:  ['1-9', '10-49', '50-99', '100+'],
  [EntrepriseType.Client]:    ['1-9', '10-49', '50-99', '100+'],
};

export interface Entreprise {
  type: EntrepriseType;
  name: string;
  codeNAF: string;
  siren: string;
  employeesCategory: EmployeesCategory;
  address: string;
  position: [number, number];
}

