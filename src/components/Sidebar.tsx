// src/components/Sidebar.tsx
import React, { useState, useMemo } from 'react';
import { Entreprise } from '../type.ts';

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
    </aside>
  );
};

export default Sidebar;
