// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import nafTree from '../data/naf-tree.json';
import { Entreprise, EntrepriseType } from '../type';

interface Activity {
  id: string;
  label: string;
}

interface Division {
  id: string;
  label: string;
  children: Activity[];
}

interface SidebarProps {
  data: Entreprise[];
  onSelectEntreprise: (e: Entreprise) => void;
  onClassify: (e: Entreprise, newType: EntrepriseType) => void;
  onLocate: (e: Entreprise) => void;
  onRemove: (e: Entreprise) => void;
  radius: number;
  onRadiusChange: (r: number) => void;
  onFilterSearch: (filters: { activityId: string; employeesCategory: string; radius: number }) => Promise<void>;
}

const employeeBuckets = ['1-10', '11-50', '51-200', '201-500', '501+'];

const normalizeText = (str: string) =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const Sidebar: React.FC<SidebarProps> = ({
  data,
  onSelectEntreprise,
  onClassify,
  onLocate,
  onRemove,
  radius,
  onRadiusChange,
  onFilterSearch,
}) => {
  // Loading state for filter search
  const [filterLoading, setFilterLoading] = useState(false);

  // Recherche textuelle d'entreprise
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchText) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    fetch(
      `https://application-map.onrender.com/api/search?term=${encodeURIComponent(
        searchText
      )}`
    )
      .then(res => res.json())
      .then((res: Entreprise[]) => {
        setSuggestions(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchText]);

  const handleSearchSelect = (e: Entreprise) => {
    setSearchText('');
    setSuggestions([]);
    onSelectEntreprise(e);
  };

  // Recherche NAF / division
  const [divisions] = useState<Division[]>(nafTree as Division[]);
  const [nafSearch, setNafSearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [employeesCategory, setEmployeesCategory] = useState(employeeBuckets[0]);

  const searchNorm = normalizeText(nafSearch);
  const filteredDivs = divisions
    .map(div => {
      if (!nafSearch) return div;
      const divNorm = normalizeText(div.label);
      const divMatches = divNorm.includes(searchNorm);
      const childMatches = div.children.filter(act =>
        normalizeText(act.label).includes(searchNorm)
      );
      if (divMatches) return div;
      if (childMatches.length) return { ...div, children: childMatches };
      return null;
    })
    .filter((d): d is Division => d !== null);

  const handleFilterClick = async () => {
    console.log('Filtres envoyés →', {
      activityId: selectedActivity,
      employeesCategory,
      radius
    });
    setFilterLoading(true);
    try {
      await onFilterSearch({ activityId: selectedActivity, employeesCategory, radius });
    } catch (err) {
      console.error('Erreur lors de la recherche par filtres :', err);
    }
    setFilterLoading(false);
  };

  return (
    <div className="sidebar">
      {/* Recherche entreprise */}
      <h2>Rechercher</h2>
      <div className="search-container">
        <input
          className="search"
          type="text"
          placeholder="Nom, SIREN, adresse..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        {searchText && (
          <button className="clear-suggestions" onClick={() => setSearchText('')}>×</button>
        )}
        {loading && <div className="loading">Chargement...</div>}
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map(s => (
              <li key={s.siren} onClick={() => handleSearchSelect(s)}>
                <div className="name">{s.name}</div>
                <div className="address">{s.address}</div>
              </li>
            ))}
          </ul>
        )}
      </div> {/* Fin search-container */}

      {/* Filtres */}
      <h2>Rechercher par catégorie</h2>
      <div className="filters">
        <div className="filter-group">
          <label>Activités</label>
          <input
            type="text"
            placeholder="Filtre d'activités.."
            value={nafSearch}
            onChange={e => setNafSearch(e.target.value)}
            className="search"
          />
          <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {filteredDivs.map(div => (
              <optgroup key={div.id} label={div.label}>
                {div.children.map(act => (
                  <option key={act.id} value={act.id}>{act.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Effectifs</label>
          <select value={employeesCategory} onChange={e => setEmployeesCategory(e.target.value)}>
            {employeeBuckets.map(bucket => (
              <option key={bucket} value={bucket}>{bucket}</option>
            ))}
          </select>
        </div>
        <div className="slider-group">
          <span>Rayon : {radius} km</span>
          <input
            type="range"
            min={5}
            max={50}
            value={radius}
            onChange={e => onRadiusChange(Number(e.target.value))}
          />
        </div>
        <button
          className="btn-primary"
          onClick={handleFilterClick}
          disabled={!selectedActivity || filterLoading}
        >
          {filterLoading ? 'Recherche...' : 'Lancer la recherche'}
        </button>
      </div>

      {/* Liste des entreprises */}
      <div className="user-list">
        <h2>Résultats</h2>
        {data.map(e => (
          <div key={e.siren} className="user-item">
            <div className="user-info">
              <div className="name">{e.name}</div>
              <div className="address">{e.address}</div>
            </div>
            <div className="user-actions">
              <button className="btn-sm" onClick={() => onLocate(e)}>📍</button>
              <button className="btn-sm" onClick={() => onClassify(e, EntrepriseType.Client)}>✓</button>
              <button className="btn-sm" onClick={() => onClassify(e, EntrepriseType.Prospect)}>?</button>
              <button className="icon-btn" onClick={() => onRemove(e)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
