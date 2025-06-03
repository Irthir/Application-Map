// src/components/FloatingPanel.tsx
import React from 'react';
import { Entreprise, EntrepriseType } from '../type.ts';

// --- MAPPING CODES EMPLOYES -> LABEL ---
const empCodeLabels: Record<string, string> = {
  "00": "0",
  "01": "1-2",
  "02": "3-5",
  "03": "6-9",
  "11": "10-19",
  "12": "20-49",
  "21": "50-99",
  "22": "100-199",
  "31": "200-249",
  "32": "250-499",
  "41": "500-999",
  "42": "1000-1999",
  "51": "2000-4999",
  "52": "5000-9999",
  "53": "10000+",
  "NN": "Donnée manquante",
  "": "Donnée manquante",
  null: "Donnée manquante",
  undefined: "Donnée manquante"
};

interface FloatingPanelProps {
  data: Entreprise[];                                   // recherches en cours
  onClassify: (e: Entreprise, type: EntrepriseType) => void;
  onLocate: (e: Entreprise) => void;
  onRemove: (e: Entreprise) => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  data,
  onClassify,
  onLocate,
  onRemove
}) => (
  <section className="list">
    <div className="list-header">Résultats de recherche</div>

    {data.length === 0 ? (
      <div className="list-item">Aucun résultat pour l’instant.</div>
    ) : (
      data.map((e, i) => {
        const catCode = e.employeesCategory;
        const empCat = empCodeLabels.hasOwnProperty(catCode)
          ? empCodeLabels[catCode]
          : "Donnée manquante";
        return (
          <div key={e.siren + i} className="list-item flex-between">
            <div className="item-info">
              <div className="name">{e.name || '—'}</div>
              <div className="address">{e.address}</div>
              <div className="employees">Employés : {empCat}</div>
            </div>
            <div className="item-actions">
              <button
                className="btn-sm"
                onClick={() => onClassify(e, EntrepriseType.Client)}
              >
                Client
              </button>
              <button
                className="btn-sm"
                onClick={() => onClassify(e, EntrepriseType.Prospect)}
              >
                Prospect
              </button>
              <button
                className="icon-btn"
                title="Localiser sur la carte"
                onClick={() => onLocate(e)}
              >
                📍
              </button>
              <button
                className="icon-btn"
                title="Supprimer"
                onClick={() => onRemove(e)}
              >
                ❌
              </button>
            </div>
          </div>
        );
      })
    )}
  </section>
);

export default FloatingPanel;
