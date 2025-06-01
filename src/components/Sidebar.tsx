import React, { useState, useEffect } from 'react';
import nafTree from '../data/naf-tree.json';
import sectionLabelsJson from '../data/naf-sections.json';
const sectionLabels = sectionLabelsJson as Record<string, string>;
import { Entreprise, EntrepriseType } from '../type';

interface Activity { id: string; label: string; }
interface Division { id: string; label: string; children: Activity[]; }
interface SidebarProps {
  data: Entreprise[];
  onSelectEntreprise: (e: Entreprise) => void;
  onClassify: (e: Entreprise, newType: EntrepriseType) => void;
  onLocate: (e: Entreprise) => void;
  onRemove: (e: Entreprise) => void;
  onSearchSimilar: (e: Entreprise) => void; // Ajouté ici
  radius: number;
  onRadiusChange: (r: number) => void;
  onFilterSearch: (filters: { activityId: string; employeesCategory: string; radius: number }) => Promise<void>;
}

const employeeBuckets = ['1-10', '11-50', '51-200', '201-500', '501+'];
const normalizeText = (str: string) =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const Sidebar: React.FC<SidebarProps> = ({
  data, onSelectEntreprise, onClassify, onLocate, onRemove, onSearchSimilar,
  radius, onRadiusChange, onFilterSearch
}) => {
  const [filterLoading, setFilterLoading] = useState(false);

  // Search entreprises
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchText) return setSuggestions([]);
    setLoading(true);
    fetch(`https://application-map.onrender.com/api/search?term=${encodeURIComponent(searchText)}`)
      .then(res => res.json())
      .then((res: Entreprise[]) => setSuggestions(res))
      .finally(() => setLoading(false));
  }, [searchText]);

  const handleSearchSelect = (e: Entreprise) => {
    setSearchText(''); setSuggestions([]);
    onSelectEntreprise(e);
  };

  // Prépare les divisions NAF avec le libellé de section issu de naf-sections.json
  const divisions: Division[] = (nafTree as { label: string; children: Activity[] }[]).map(div => {
    // Extrait le numéro de section depuis "Section XX"
    const match = div.label.match(/Section\s+(\d{1,2})/);
    const id = match ? match[1] : div.label;
    // Cherche le libellé français correspondant, sinon garde "Section XX"
    const label = id && sectionLabels[id] ? sectionLabels[id] : div.label;
    return {
      id,
      label,
      children: div.children
    };
  });

  // NAF filter state
  const [nafSearch, setNafSearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [employeesCategory, setEmployeesCategory] = useState(employeeBuckets[0]);
  const searchNorm = normalizeText(nafSearch);

  // Filtre divisions et activités
  const filteredDivs = divisions
    .map(div => {
      if (!nafSearch) return div;
      const divNorm = normalizeText(div.label);
      const childMatches = div.children.filter(a => normalizeText(a.label).includes(searchNorm));
      if (divNorm.includes(searchNorm)) return div;
      if (childMatches.length) return { ...div, children: childMatches };
      return null;
    })
    .filter((d): d is Division => !!d);

  const handleFilterClick = async () => {
    setFilterLoading(true);
    try {
      await onFilterSearch({ activityId: selectedActivity, employeesCategory, radius });
    } finally {
      setFilterLoading(false);
    }
  };

  // Color mapping
  const typeColor = (type?: EntrepriseType) =>
    type === EntrepriseType.Client   ? '#10B981'
  : type === EntrepriseType.Prospect ? '#F59E0B'
  : '#6B7280';

  // --------- BOUTON EXPORT ---------
  const exportEntreprises = () => {
    const data = localStorage.getItem("entreprises_cache");
    let exportData: string;
    if (!data || data === "[]") {
      exportData = JSON.stringify([
        {
          siren: "123456789",
          name: "Nom entreprise",
          address: "Adresse",
          type: "client | prospect",
          // Ajoute ici les autres champs si besoin
        }
      ], null, 2);
    } else {
      exportData = data;
    }
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entreprises_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------- BOUTON VIDER LE CACHE ---------
  const clearCache = () => {
    localStorage.removeItem("entreprises_cache");
    window.location.reload();
  };

  return (
    <div className="sidebar">
      <h2>Rechercher</h2>
      <div className="search-container">
        <input className="search" type="text" placeholder="Nom, SIREN, adresse..."
          value={searchText} onChange={e => setSearchText(e.target.value)} />
        {searchText && <button className="clear-suggestions" onClick={() => setSearchText('')}>×</button>}
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
      </div>

      <h2>Rechercher par catégorie</h2>
      <div className="filters">
        <div className="filter-group">
          <label>Activités</label>
          <input className="search" type="text" placeholder="Filtrer les activités..."
            value={nafSearch} onChange={e => setNafSearch(e.target.value)} />
          <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {filteredDivs.map(div => (
              <optgroup key={div.id} label={div.label}>
                {div.children.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Effectifs</label>
          <select value={employeesCategory} onChange={e => setEmployeesCategory(e.target.value)}>
            {employeeBuckets.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="slider-group">
          <span>Rayon : {radius} km</span>
          <input type="range" min={5} max={50} value={radius}
            onChange={e => onRadiusChange(+e.target.value)} />
        </div>
        <button className="btn-primary" onClick={handleFilterClick}
          disabled={!selectedActivity || filterLoading}>
          {filterLoading ? 'Recherche...' : 'Lancer la recherche'}
        </button>
      </div>

      <div className="user-list">
        <h2>Clients & Prospects</h2>
        {data.map(e => {
          const color = typeColor(e.type);
          const isClient = e.type === EntrepriseType.Client;
          return (
            <div key={e.siren} className="user-item" style={{ borderLeft: `4px solid ${color}` }}>
              <div className="user-info">
                <div className="name">{e.name}</div>
                <div className="address">{e.address}</div>
              </div>
              <div className="user-actions">
                <button className="btn-sm" onClick={() => onLocate(e)}>📍</button>
                {isClient
                  ? <button className="btn-sm" onClick={() => onClassify(e, EntrepriseType.Prospect)}>Prospect</button>
                  : <button className="btn-sm" onClick={() => onClassify(e, EntrepriseType.Client)}>Client</button>
                }
                <button className="icon-btn" onClick={() => onRemove(e)}>🗑️</button>
                {/* BOUTON RECHERCHER SIMILAIRE */}
                <button
                  className="btn-sm"
                  style={{ background: "#f59e42", color: "#fff", marginLeft: 8 }}
                  title="Rechercher des entreprises similaires à celle-ci"
                  onClick={() => onSearchSimilar(e)}
                >
                  Rechercher similaire
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --------- BOUTONS EXPORT / CLEAR --------- */}
      <button
        onClick={exportEntreprises}
        style={{
          marginTop: 32,
          padding: "10px 20px",
          background: "#3182ce",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          width: "100%",
        }}
      >
        Exporter les entreprises
      </button>
      <button
        onClick={clearCache}
        style={{
          marginTop: 12,
          padding: "10px 20px",
          background: "#f87171",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          width: "100%",
        }}
      >
        Vider le cache
      </button>
      {/* --------- FIN AJOUT --------- */}
    </div>
  );
};

export default Sidebar;
