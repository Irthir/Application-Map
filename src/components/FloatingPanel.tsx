// src/components/FloatingPanel.tsx
import React from 'react';
import { Entreprise, EntrepriseType } from '../type';

// Tableau par défaut pour fallback
const dummyEntreprises: Entreprise[] = [
  {
    type: EntrepriseType.Recherche,
    siren: '123456789',
    name: 'Exemple SARL',
    codeNAF: '47.11A',
    employeesCategory: '1-9',
    address: '1 Rue de l’Exemple, 75000 Paris',
    position: [2.3522, 48.8566]
  },
  {
    type: EntrepriseType.Recherche,
    siren: '987654321',
    name: 'Test SA',
    codeNAF: '62.01Z',
    employeesCategory: '10-49',
    address: '10 Avenue du Test, 69000 Lyon',
    position: [4.8357, 45.7640]
  }
];

interface FloatingPanelProps {
  data?: Entreprise[];
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ data }) => {
  const list = data && data.length > 0 ? data : dummyEntreprises;

  return (
    <section className="list">
      <div className="list-header">Liste des entreprises</div>
      {list.map((e, i) => (
        <div key={i} className="list-item">
          <div className="name">{e.name}</div>
          <div className="address">{e.address}</div>
          <div className="industry">{e.type}</div>
        </div>
      ))}
    </section>
  );
};

export default FloatingPanel;
