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
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    fetch(`https://application-map.onrender.com/api/search?term=${encodeURIComponent(searchTerm)}`)
      .then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); })
      .then((rows: Entreprise[]) => {
        // parser position string en [lng, lat]
        const parsed = rows.map(e => {
          if (typeof e.position === 'string') {
            const posStr = e.position as string;
            const [lng, lat] = posStr
              .replace(/[\[\]\s]/g, '')
              .split(',')
              .map(Number);
            return { ...e, position: [lng, lat] as [number, number] };
          }
          return e;
        });
        setSuggestions(parsed);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [searchTerm]);

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

      {suggestions.length > 0 ? (
        <ul className="suggestions">
          {suggestions.map((e, i) => (
            <li key={e.siren + i} onClick={() => onSelectEntreprise(e)}>
              {e.name || '—'} — {e.siren} — {e.address}
            </li>
          ))}
        </ul>
      ) : (
        searchTerm && (
          <div className="no-results">Aucun résultat pour “{searchTerm}”</div>
        )
      )}

      {/* Filtres désactivés */}
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
