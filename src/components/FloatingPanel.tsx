import React from 'react';
import { Entreprise } from '../type.ts';

interface FloatingPanelProps {
  data: Entreprise[];
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ data }) => (
  <section className="list">
    <div className="list-header">Liste des entreprises</div>
    {data.map((e, i) => (
      <div key={i} className="list-item">
        <div className="name">{e.name}</div>
        <div className="address">{e.address}</div>
        <div className="industry">{e.type}</div>
      </div>
    ))}
  </section>
);

export default FloatingPanel;
