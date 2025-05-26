// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Entreprise, EntrepriseType } from '../type.ts';
import nafCodes from '../data/naf-codes.json';

interface SidebarProps {
  data: Entreprise[];
  onSelectEntreprise: (e: Entreprise) => void;
  onClassify: (e: Entreprise, newType: EntrepriseType) => void;
  onLocate: (e: Entreprise) => void;
  onRemove: (e: Entreprise) => void;
  /** Recherche par filtres (NAF, effectifs, rayon) */
  onFilterSearch: (filters: {
    naf: string;
    employeesCategory: string;
    radius: number;
  }) => void;
}

const employeeBuckets = ['1-9', '10-49', '50-99', '100+'];

const Sidebar: React.FC<SidebarProps> = ({
  data,
  onSelectEntreprise,
  onClassify,
  onLocate,
  onRemove,
  onFilterSearch
}) => {
  // recherche texte
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);

  // filtres
  const [naf, setNaf] = useState(''); 
  const [employeesCategory, setEmployeesCategory] = useState('');
  const [radius, setRadius] = useState(20);

  const term = searchTerm.trim();

  // effet recherche texte
  useEffect(() => {
    if (term.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    const to = setTimeout(() => {
      setLoading(true);
      fetch(
        `https://application-map.onrender.com/api/search?term=${encodeURIComponent(term)}`,
        { signal: ctl.signal }
      )
        .then(r => {
          if (!r.ok) throw new Error(r.status.toString());
          return r.json();
        })
        .then((rows: Entreprise[]) => {
          const parsed = rows.map(e => {
            if (typeof e.position === 'string') {
              const [lng, lat] = (e.position as string)
                .replace(/[\[\]\s]/g, '')
                .split(',')
                .map(Number);
              return { ...e, position: [lng, lat] as [number, number] };
            }
            return e;
          });
          setSuggestions(parsed);
        })
        .catch(err => {
          if (err.name !== 'AbortError') setSuggestions([]);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(to);
      ctl.abort();
    };
  }, [term]);

  const handleSuggestionClick = (e: Entreprise) => {
    setSuggestions([]);
    setSearchTerm('');
    onSelectEntreprise(e);
  };

  const handleFilterClick = () => {
    onFilterSearch({ naf, employeesCategory, radius });
  };

  return (
    <aside className="sidebar">
      {/* Recherche texte */}
      <div className="search-container">
        <h2>Recherche par nom, SIREN ou adresse</h2>
        <input
          type="text"
          className="search"
          placeholder="Rechercher par nom, SIREN ou adresse"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {suggestions.length > 0 && (
          <button
            className="clear-suggestions"
            onClick={() => setSuggestions([])}
            aria-label="Fermer la liste"
          >
            ×
          </button>
        )}
        {loading && <div className="loading">Chargement...</div>}
        {term.length >= 3 && suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((e, i) => (
              <li key={e.siren + i} onClick={() => handleSuggestionClick(e)}>
                {e.name || '—'} — {e.siren} — {e.address}
              </li>
            ))}
          </ul>
        )}
        {term.length >= 3 && !loading && suggestions.length === 0 && (
          <div className="no-results">Aucun résultat pour « {term} »</div>
        )}
      </div>

      {/* Recherche par filtres */}
      <div className="filters">
        <h2>Recherche par catégorie</h2>

        <label>Code NAF</label>
        <select value={naf} onChange={e => setNaf(e.target.value)}>
          {nafCodes.map(code => (
            <option key={code.id} value={code.id}>
              {code.id} — {code.label}
            </option>
          ))}
        </select>

        <label>Effectifs</label>
        <select
          value={employeesCategory}
          onChange={e => setEmployeesCategory(e.target.value)}
        >
          {employeeBuckets.map(bucket => (
            <option key={bucket} value={bucket}>
              {bucket}
            </option>
          ))}
        </select>

        <label>
          Rayon : {radius} km
          <input
            type="range"
            min={5}
            max={50}
            value={radius}
            onChange={e => setRadius(+e.target.value)}
          />
        </label>

        <button className="btn-primary" onClick={handleFilterClick}>
          Lancer la recherche
        </button>
      </div>

      {/* Mes clients & prospects */}
      <div className="user-list">
        <h2>Mes clients &amp; prospects</h2>
        {data.length === 0 ? (
          <div className="empty">Aucune entreprise ajoutée.</div>
        ) : (
          data.map((e, i) => (
            <div key={e.siren + i} className="user-item">
              <div>
                <strong>{e.name || '—'}</strong><br />
                <small>{e.address}</small>
              </div>
              <div className="user-actions">
                <button
                  className="btn-sm"
                  onClick={() =>
                    onClassify(
                      e,
                      e.type === EntrepriseType.Client
                        ? EntrepriseType.Prospect
                        : EntrepriseType.Client
                    )
                  }
                >
                  {e.type === EntrepriseType.Client ? 'Prospect' : 'Client'}
                </button>
                <button
                  className="icon-btn"
                  title="Localiser"
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
      </div>
    </aside>
  );
};

export default Sidebar;
