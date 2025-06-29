import React, { useState, useEffect, useRef } from 'react';
import nafTree from '../data/naf-tree.json';
import sectionLabelsJson from '../data/naf-sections.json';
const sectionLabels = sectionLabelsJson as Record<string, string>;
import { Entreprise, EntrepriseType } from '../type';
import toast from 'react-hot-toast';

interface Activity { id: string; label: string; }
interface Division { id: string; label: string; children: Activity[]; }
interface NafSection { id: string; label: string; children: Activity[]; }
interface SidebarProps {
  data: Entreprise[];
  onSelectEntreprise: (e: Entreprise) => void;
  onClassify: (e: Entreprise, newType: EntrepriseType) => void;
  onLocate: (e: Entreprise) => void;
  onRemove: (e: Entreprise) => void;
  onSearchSimilar: (e: Entreprise) => void;
  radius: number;
  onRadiusChange: (r: number) => void;
  onFilterSearch: (filters: { nafCodes?: string[]; activityId?: string; employeesCategory: string; radius: number }) => Promise<void>;
}

const employeeBuckets = ['1-10', '11-50', '51-200', '201-500', '501+', 'inconnu'];
const normalizeText = (str: string) =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Conversion code interne → libellé humain
function codeToHumanEmployees(code: string | undefined | null): string {
  if (!code || code === "NN") return "inconnu";
  if (["01", "02", "03", "00"].includes(code)) return "1-10";
  if (["11", "12"].includes(code)) return "11-50";
  if (["21", "22"].includes(code)) return "51-200";
  if (["31", "32"].includes(code)) return "201-500";
  if (["41", "42", "51", "52", "53"].includes(code)) return "501+";
  return "inconnu";
}

// Conversion libellé humain → code interne (utilisé à l'import dans App.tsx)
export function humanToCodeEmployees(human: string | undefined | null): string {
  if (!human || human === "inconnu") return "NN";
  switch (human) {
    case "1-10": return "03";
    case "11-50": return "12";
    case "51-200": return "22";
    case "201-500": return "32";
    case "501+": return "41";
    default: return "NN";
  }
}

/*const empCodeLabels: Record<string, string> = {
  "00": "0",
  "01": "1-2",
  "02": "3-5",
  "03": "6-9",
  "11": "10-19",
  "12": "20-49",
  "21": "50-99",
  "22": "100-199",
  "31": "200-249",
  "32": "250-499",
  "41": "500-999",
  "42": "1000-1999",
  "51": "2000-4999",
  "52": "5000-9999",
  "53": "10000+",
  "NN": "Donnée manquante",
  "": "Donnée manquante",
  null: "Donnée manquante",
  undefined: "Donnée manquante"
};*/

const nafSections: NafSection[] = (nafTree as any[]).map(section => {
  const match = section.label.match(/Section\s+(\d+)/);
  const id = match ? match[1] : section.label;
  const label = sectionLabels[id] ? sectionLabels[id] : section.label;
  return { id, label, children: section.children };
});

const Sidebar: React.FC<SidebarProps> = ({
  data, onSelectEntreprise, onClassify, onLocate, onRemove, onSearchSimilar,
  radius, onRadiusChange, onFilterSearch
}) => {
  const [filterLoading, setFilterLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Recherche entreprises texte
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAbort = useRef<AbortController | null>(null);

  // Recherche d'entreprise par nom/adresse/SIREN
  useEffect(() => {
    if (currentAbort.current) currentAbort.current.abort();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchText || searchText.length <= 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    toast.loading("Recherche en cours...", { id: "autocomplete" });
    debounceTimer.current = setTimeout(() => {
      setShowSuggestions(true);
      const controller = new AbortController();
      currentAbort.current = controller;

      fetch(
        `https://application-map.onrender.com/api/search?term=${encodeURIComponent(searchText)}`,
        { signal: controller.signal }
      )
        .then(res => res.json())
        .then((res: Entreprise[]) => {
          setSuggestions(Array.isArray(res) ? res : []);
          if (Array.isArray(res) && res.length > 0)
            toast.success(`Recherche terminée : ${res.length} résultat(s)`, { id: "autocomplete" });
          else
            toast.error("Aucun résultat trouvé.", { id: "autocomplete" });
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            toast.error('Erreur lors de la recherche.', { id: "autocomplete" });
            console.error('Recherche auto-complétion échouée', err);
          }
        })
        .finally(() => {
          setLoading(false);
          currentAbort.current = null;
        });
    }, 1000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (currentAbort.current) currentAbort.current.abort();
    };
  }, [searchText]);

  useEffect(() => {
    if (filterLoading) setSuggestions([]);
  }, [filterLoading]);

  const handleSearchSelect = (e: Entreprise) => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSelectEntreprise(e);
  };

  // Gestion section / activité
  const [selectedSection, setSelectedSection] = useState('');
  const [nafSearch, setNafSearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [employeesCategory, setEmployeesCategory] = useState(employeeBuckets[0]);
  const searchNorm = normalizeText(nafSearch);

  const selectedSectionCodes = selectedSection
    ? (nafSections.find(s => s.id === selectedSection)?.children.map(a => a.id) ?? [])
    : [];

  const availableDivs: Division[] =
    selectedSection
      ? [{
          id: selectedSection,
          label: nafSections.find(s => s.id === selectedSection)?.label || '',
          children: nafSections.find(s => s.id === selectedSection)?.children || []
        }]
      : (nafTree as { label: string; children: Activity[] }[]).map((div, idx) => ({
          id: div.label || String(idx),
          label: div.label,
          children: div.children
        }));

  const filteredDivs = availableDivs
    .map(div => {
      if (!nafSearch) return div;
      const divNorm = normalizeText(div.label);
      const childMatches = div.children.filter(a => normalizeText(a.label).includes(searchNorm));
      if (divNorm.includes(searchNorm)) return div;
      if (childMatches.length) return { ...div, children: childMatches };
      return null;
    })
    .filter((d): d is Division => !!d);

  const typeColor = (type?: EntrepriseType) =>
    type === EntrepriseType.Client   ? '#10B981'
  : type === EntrepriseType.Prospect ? '#F59E0B'
  : '#6B7280';

  // --------- EXPORTER LES ENTREPRISES EN CSV ---------
  const exportEntreprises = () => {
    const data = localStorage.getItem("entreprises_cache");
    let rows: Entreprise[] = [];
    if (data && data !== "[]") {
      try {
        rows = JSON.parse(data);
      } catch {
        rows = [];
      }
    }
    if (!rows.length) {
      exportPatronImport();
      return;
    }
    const headers = ["siren", "name", "address", "type", "codeNAF", "employeesCategory"];
    const csv = [
      headers.join(","),
      ...rows.map(e =>
        headers.map(h => {
          let val = (e as any)[h] ?? "";
          // Conversion code interne → libellé pour le CSV
          if (h === "employeesCategory") {
            val = codeToHumanEmployees(val);
          }
          if (typeof val === "string" && (val.includes(",") || val.includes("\n") || val.includes('"'))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entreprises_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------- MODELE CSV D'IMPORT ---------
  const exportPatronImport = () => {
    const csv =
      "siren,name,address,type,codeNAF,employeesCategory\n" +
      '123456789,"Nom entreprise","1 rue de la Paix, 75000 Paris",client,1234Z,1-10\n' +
      '987654321,"Entreprise Test","10 avenue de Lyon, 69000 Lyon",prospect,5610A,11-50\n' +
      '555666777,"Boulangerie Dupont","5 rue des Lilas, 75012 Paris",client,1071C,51-200\n' +
      '999888777,"Société Inconnue","12 rue inconnue, 75000 Paris",prospect,4321B,inconnu\n' +
      "# type : client ou prospect\n" +
      "# employeesCategory : 1-10, 11-50, 51-200, 201-500, 501+, inconnu\n" +
      "# codeNAF : optionnel (laisser vide si inconnu)\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_import_entreprises.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --------- BOUTON VIDER LE CACHE ---------
  const clearCache = () => {
    localStorage.removeItem("entreprises_cache");
    window.location.reload();
  };

  // --------- ACTION RECHERCHE ---------
  const handleFilterClick = async () => {
    setFilterLoading(true);
    try {
      setSuggestions([]);
      if (selectedSection && selectedSectionCodes.length) {
        await onFilterSearch({
          nafCodes: selectedSectionCodes,
          employeesCategory,
          radius
        });
      } else {
        await onFilterSearch({
          activityId: selectedActivity,
          employeesCategory,
          radius
        });
      }
    } finally {
      setFilterLoading(false);
    }
  };

  return (
    <div className="sidebar" style={{ height: "100vh", overflowY: "auto" }}>
      <h2>Rechercher</h2>
      <div className="search-container">
        <input className="search" type="text" placeholder="Nom, SIREN, adresse..."
          value={searchText} onChange={e => setSearchText(e.target.value)} />
        {searchText && <button className="clear-suggestions" onClick={() => setSearchText('')}>×</button>}
        {loading && <div className="loading">Chargement...</div>}
        {suggestions.length > 0 && showSuggestions && (
        <div className="suggestions-container" style={{ position: 'relative' }}>
          <button
            className="hide-suggestions"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: 'transparent',
              border: 'none',
              fontSize: '1.2em',
              cursor: 'pointer'
            }}
            onClick={() => setShowSuggestions(false)}
          >×</button>
          <ul className="suggestions">
            {suggestions.map(s => (
              <li
                key={`${s.siren}-${s.address}`}
                onClick={() => handleSearchSelect(s)}
              >
                <div className="name">{s.name}</div>
                <div className="address">{s.address}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      </div>

      <h2>Rechercher par catégorie</h2>
      <div className="filters">
        {/* Sélection de la section */}
        <div className="filter-group">
          <label>Section</label>
          <select
            value={selectedSection}
            onChange={e => {
              setSelectedSection(e.target.value);
              setSelectedActivity('');
              setNafSearch('');
            }}
          >
            <option value="">-- Toutes les sections --</option>
            {nafSections.map((s) => {
              let code = '';
              const m = String(s.label).match(/Section\s+(\d+)/);
              if (m) code = m[1].padStart(2, '0');
              else if (/^\d+$/.test(s.id)) code = s.id.padStart(2, '0');
              else code = s.id;
              const label = sectionLabels[code] || s.label;
              return (
                <option key={s.id} value={s.id}>{label}</option>
              );
            })}
          </select>
        </div>

        {/* Sélection activité */}
        <div className="filter-group">
          <label>Activités</label>
          <input
            className="search"
            type="text"
            placeholder="Filtrer les activités..."
            value={nafSearch}
            onChange={e => setNafSearch(e.target.value)}
          />
          <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)}>
            <option value="">
              -- {selectedSection
                ? `Rechercher sur toute la section ${
                    (() => {
                      const selSectionObj = nafSections.find(s => s.id === selectedSection);
                      let code = '';
                      if (selSectionObj) {
                        const m = String(selSectionObj.label).match(/Section\s+(\d+)/);
                        if (m) code = m[1].padStart(2, '0');
                        else if (/^\d+$/.test(selSectionObj.id)) code = selSectionObj.id.padStart(2, '0');
                        else code = selSectionObj.id;
                      }
                      return sectionLabels[code] || selectedSection;
                    })()
                  }`
                : "Rechercher sur toute la Section"
              } --
            </option>
            {filteredDivs.map(div => {
              let code = '';
              const m = String(div.label).match(/Section\s+(\d+)/);
              if (m) code = m[1].padStart(2, '0');
              else if (/^\d+$/.test(div.id)) code = div.id.padStart(2, '0');
              else code = div.id;
              const label = sectionLabels[code] || div.label;
              return (
                <optgroup key={div.id} label={label}>
                  {div.children.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Effectifs */}
        <div className="filter-group">
          <label>Effectifs</label>
          <select value={employeesCategory} onChange={e => setEmployeesCategory(e.target.value)}>
            {employeeBuckets.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Rayon */}
        <div className="slider-group">
          <span>Rayon : {radius} km</span>
          <input
            type="range"
            min={5}
            max={30}
            value={radius}
            onChange={e => onRadiusChange(+e.target.value)}
          />
        </div>

        {/* Bouton recherche */}
        <button
          className="btn-primary"
          onClick={handleFilterClick}
          disabled={filterLoading || (!(selectedSection && selectedSectionCodes.length) && !selectedActivity)}
        >
          {filterLoading ? 'Recherche...' : 'Lancer la recherche'}
        </button>
      </div>

      <div className="user-list">
        <h2>Clients & Prospects</h2>
        {data.map(e => {
          const color = typeColor(e.type);
          const isClient = e.type === EntrepriseType.Client;
          // Affichage du libellé humain, non du code interne
          const empCat = codeToHumanEmployees(e.employeesCategory);
          return (
            <div key={e.siren} className="user-item" style={{ borderLeft: `4px solid ${color}` }}>
              <div className="user-info">
                <div className="name">{e.name}</div>
                <div className="address">{e.address}</div>
                <div className="employees">Employés : {empCat}</div>
              </div>
              <div className="user-actions" style={{ width: "170px" }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                  <button className="btn-sm" onClick={() => onLocate(e)}>📍</button>
                  {isClient
                    ? <button className="btn-sm" onClick={() => onClassify(e, EntrepriseType.Prospect)}>Prospect</button>
                    : <button className="btn-sm" onClick={() => onClassify(e, EntrepriseType.Client)}>Client</button>
                  }
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn-sm"
                    style={{ background: "#f59e42", color: "#fff", flex: 1 }}
                    title="Rechercher des entreprises similaires à celle-ci"
                    onClick={() => onSearchSimilar(e)}
                  >
                    Rechercher similaire
                  </button>
                  <button className="icon-btn" onClick={() => onRemove(e)}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={exportPatronImport}
        style={{
          marginTop: 0,
          padding: "10px 20px",
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          width: "100%",
        }}
      >
        Télécharger un modèle d’import
      </button>

      {data && data.length > 0 && (
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
          Exporter les entreprises (CSV)
        </button>
      )}
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
    </div>
  );
};

export default Sidebar;
