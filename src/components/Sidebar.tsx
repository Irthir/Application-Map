// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Entreprise } from '../type.ts';

interface SidebarProps {
  onSelectEntreprise: (e: Entreprise) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectEntreprise }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    fetch(`https://application-map.onrender.com/api/search?term=${encodeURIComponent(searchTerm)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Entreprise[]) => setSuggestions(data))
      .catch(err => {
        console.error('Erreur fetch suggestions', err);
        setSuggestions([]);
      })
      .finally(() => setLoading(false));
  }, [searchTerm]);

  const handleSelect = (e: Entreprise) => {
    setSearchTerm(e.name);
    setSuggestions([]);
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
      {loading && <div className="loading">Chargement...</div>}
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((e, idx) => (
            <li key={idx} onClick={() => handleSelect(e)}>
              {e.name} — {e.siren} — {e.address}
            </li>
          ))}
        </ul>
      )}

      {/*
        Contrôles de filtre désactivés pour l'instant :
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
            <option>50-99</option>
          </select>
        </div>
        <div className="slider-group">
          <span>Rayon</span>
          <input type="range" min="1" max="50" />
          <span>22 km</span>
        </div>
        <button className="btn-primary">Appliquer les filtres</button>
      */}
    </aside>
  );
};

export default Sidebar;
