// src/components/Sidebar.tsx
import React, { useState, useMemo } from 'react';
import { Entreprise } from '../type';

interface SidebarProps {
  data: Entreprise[];
  onSelectEntreprise: (e: Entreprise) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ data, onSelectEntreprise }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const suggestions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];

    return data
      .filter(e =>
        e.name.toLowerCase().includes(term) ||
        e.siren.includes(term) ||
        e.address.toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [searchTerm, data]);

  const handleSelect = (e: Entreprise) => {
    setSearchTerm(e.name);
    onSelectEntreprise(e);
  };

  return (
    <aside className="sidebar">
      <input
        type="text"
        className="search"
        placeholder="Rechercher par nom, SIREN ou adresse"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      
      {suggestions.length > 0 ? (
        <ul className="suggestions">
          {suggestions.map((e, idx) => (
            <li key={e.siren + idx} onClick={() => handleSelect(e)}>
              {e.name || '—'} — {e.siren} — {e.address}
            </li>
          ))}
        </ul>
      ) : (
        searchTerm && (
          <div className="no-results">
            Aucun résultat pour “{searchTerm}”
          </div>
        )
      )}

      {/* 
        Contrôles de filtre (désactivés pour le moment)
      */}
      <div className="filters">
        <h2>Filtrer les résultats</h2>
        <div className="filter-group">
          <label>Type</label>
          <select>
            <option>Prospect</option>
            <option>Client</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Effectifs</label>
          <select>
            <option>1-9</option>
            <option>10-49</option>
            <option>50-99</option>
            <option>100+</option>
          </select>
        </div>
        <div className="slider-group">
          <span>Rayon</span>
          <input type="range" min="1" max="50" />
          <span>22 km</span>
        </div>
        <button className="btn-primary">Appliquer les filtres</button>
      </div>

    </aside>
  );
};

export default Sidebar;
