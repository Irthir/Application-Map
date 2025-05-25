// src/components/FloatingPanel.tsx
import React from 'react';
import { Entreprise, EntrepriseType } from '../type.ts';

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
      data.map((e, i) => (
        <div key={e.siren + i} className="list-item flex-between">
          <div className="item-info">
            <div className="name">{e.name || '—'}</div>
            <div className="address">{e.address}</div>
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
      ))
    )}
  </section>
);

export default FloatingPanel;
