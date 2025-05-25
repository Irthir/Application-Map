// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Entreprise, EntrepriseType } from '../type.ts';

interface SidebarProps {
  data: Entreprise[];                              // clients/prospects classés
  onSelectEntreprise: (e: Entreprise) => void;     // pour afficher un résultat recherché
  onClassify: (e: Entreprise, newType: EntrepriseType) => void;
  onLocate: (e: Entreprise) => void;
  onRemove: (e: Entreprise) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  data,
  onSelectEntreprise,
  onClassify,
  onLocate,
  onRemove
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);
  const term = searchTerm.trim();

  useEffect(() => {
    if (term.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(
        `https://application-map.onrender.com/api/search?term=${encodeURIComponent(term)}`,
        { signal: controller.signal }
      )
        .then(res => {
          if (!res.ok) throw new Error(res.status.toString());
          return res.json();
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
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const handleSuggestionClick = (e: Entreprise) => {
    setSuggestions([]);
    setSearchTerm('');
    onSelectEntreprise(e);
  };

  return (
    <aside className="sidebar">
      {/* Recherche */}
      <div className="search-container" style={{ position: 'relative' }}>
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
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              background: 'transparent',
              border: 'none',
              fontSize: 16,
              cursor: 'pointer'
            }}
            aria-label="Fermer la liste"
          >
            ×
          </button>
        )}
      </div>
      {loading && <div className="loading">Chargement...</div>}
      {term.length >= 3 && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((e, i) => (
            <li
              key={e.siren + i}
              onClick={() => handleSuggestionClick(e)}
              style={{ cursor: 'pointer' }}
            >
              {e.name || '—'} — {e.siren} — {e.address}
            </li>
          ))}
        </ul>
      )}
      {term.length >= 3 && !loading && suggestions.length === 0 && (
        <div className="no-results">Aucun résultat pour “{term}”</div>
      )}

      {/* Filtres désactivés */}
      <div className="filters">
        <h2>Filtres</h2>
        <div className="filter-group">
          <label>Type</label>
          <select disabled>
            <option>Prospect</option>
            <option>Client</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Effectifs</label>
          <select disabled>
            <option>1-9</option>
            <option>10-49</option>
            <option>50-99</option>
            <option>100+</option>
          </select>
        </div>
        <div className="slider-group">
          <span>Rayon</span>
          <input type="range" min="1" max="50" disabled />
          <span>22 km</span>
        </div>
        <button className="btn-primary" disabled>
          Appliquer
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
              <div className="user-info">
                <div className="name">{e.name || '—'}</div>
                <div className="address">{e.address}</div>
              </div>
              <div className="user-actions">
                {/* bascule Client ↔ Prospect */}
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
                {/* recentrer sur la carte */}
                <button
                  className="icon-btn"
                  title="Localiser"
                  onClick={() => onLocate(e)}
                >
                  📍
                </button>
                {/* supprimer de la liste et de la carte */}
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
