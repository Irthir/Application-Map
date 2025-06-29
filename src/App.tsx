import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Map from './components/Map'
import FloatingPanel from './components/FloatingPanel'
import { Entreprise, EntrepriseType } from './type'
import './index.css'
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Copie ici si pas exporté :
// (Sinon, tu peux importer depuis Sidebar.tsx)
function humanToCodeEmployees(human: string | undefined | null): string {
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

const ENTREPRISES_CACHE_KEY = "entreprises_cache";

function parseCsv(csv: string): Entreprise[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols: string[] = [];
    let i = 0, inQuotes = false, col = '';
    while (i < line.length) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          col += '"'; i += 2; continue;
        }
        inQuotes = !inQuotes; i++; continue;
      }
      if (!inQuotes && char === ',') {
        cols.push(col); col = ''; i++; continue;
      }
      col += char; i++;
    }
    cols.push(col);
    const obj: any = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx]?.trim() ?? ""; });
    if (obj.type !== "client" && obj.type !== "prospect") obj.type = undefined;
    return obj as Entreprise;
  });
  return rows.filter(e => e.siren && e.name && e.address);
}

const App: React.FC = () => {
  const [mapData, setMapData] = useState<Entreprise[]>([])
  const [searchHistory, setSearchHistory] = useState<Entreprise[]>([])
  const [userData, setUserData] = useState<Entreprise[]>([])
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566])
  const [filterRadius, setFilterRadius] = useState<number>(10)
  
  useEffect(() => {
    fetch("https://application-map.onrender.com/api/ping")
      .then(res => res.json())
      .then(data => {
        console.log("Ping backend:", data);
      })
      .catch(() => {
        console.warn("Ping backend échoué");
      });
  }, []);

  // ---- CORRECTION AUTOMATIQUE DU CACHE CORROMPU ICI ----
  useEffect(() => {
  const cached = localStorage.getItem(ENTREPRISES_CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (!Array.isArray(parsed)) throw new Error("corrupt");
        // <-- Filtre ici les entreprises dont la position est invalide
        const safe = parsed.filter(
          (e: Entreprise) =>
            e.siren && e.name && e.address &&
            Array.isArray(e.position) &&
            e.position.length === 2 &&
            typeof e.position[0] === "number" &&
            typeof e.position[1] === "number" &&
            !isNaN(e.position[0]) &&
            !isNaN(e.position[1])
        );
        if (!safe.length) throw new Error("all positions invalid");
        setUserData(safe)
        setMapData(prev => {
          const ids = new Set(safe.map((e: Entreprise) => e.siren))
          return [...prev.filter(e => !ids.has(e.siren)), ...safe]
        })
      } catch (e) {
        setUserData([])
        localStorage.removeItem(ENTREPRISES_CACHE_KEY);
        //window.location.reload();
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(ENTREPRISES_CACHE_KEY, JSON.stringify(userData))
  }, [userData])

  /** Import depuis fichier CSV (géocode chaque adresse, convertit employeesCategory) */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      let toastId: string | undefined;
      try {
        const csv = event.target?.result as string;
        toastId = toast.loading("Importation en cours...");
        const imported = parseCsv(csv);

        // Géocode chaque entreprise par adresse
        const geocode = async (address: string): Promise<[number, number] | null> => {
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
            const res = await fetch(url, {
              headers: { 'Accept-Language': 'fr' },
            });
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
              return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
            }
          } catch {}
          return null;
        };

        // Géocode en parallèle
        const results = await Promise.all(imported.map(async row => {
          const employeesCategory = humanToCodeEmployees(row.employeesCategory);
          if (row.position && Array.isArray(row.position) && row.position.length === 2) {
            return { ...row, employeesCategory };
          }
          const pos = await geocode(row.address);
          if (!pos) return null; // Géocodage impossible
          return { ...row, employeesCategory, position: pos };
        }));

        const okResults = results.filter((e): e is Entreprise => !!e && !!e.position);

        if (okResults.length) {
          setUserData(okResults);
          localStorage.setItem(ENTREPRISES_CACHE_KEY, JSON.stringify(okResults));
          setMapData(prev => {
            const ids = new Set(okResults.map(e => e.siren));
            return [...prev.filter(e => !ids.has(e.siren)), ...okResults];
          });
          toast.success(`Import terminé : ${okResults.length} entreprises importées`, { id: toastId });
        } else {
          toast.error("Aucune entreprise importée n'a pu être géolocalisée.", { id: toastId });
          alert("Aucune entreprise importée n'a pu être géolocalisée.");
        }
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier d'import.", { id: toastId });
        alert("Erreur lors de la lecture du fichier d'import.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /** Sélection depuis la recherche textuelle */
  const handleSelectEntreprise = (e: Entreprise) => {
    setCenter(e.position)
    setSearchHistory(prev =>
      prev.some(x => x.siren === e.siren && x.address === e.address)
        ? prev
        : [...prev, e]
    )
    setMapData(prev =>
      prev.some(x => x.siren === e.siren && x.address === e.address)
        ? prev
        : [...prev, e]
    )
  }

  const handleSearchClassify = (
    e: Entreprise,
    newType: EntrepriseType
  ) => {
    const classified = { ...e, type: newType }
    setUserData(prev => [...prev, classified])
    setMapData(prev =>
      prev.map(x => x.siren === e.siren ? classified : x)
    )
    setSearchHistory(prev => prev.filter(x => x.siren !== e.siren))
  }

  const handleSearchRemove = (e: Entreprise) => {
    setSearchHistory(prev => prev.filter(x => x.siren !== e.siren))
    setMapData(prev => prev.filter(x => x.siren !== e.siren))
  }

  const handleLocate = (e: Entreprise) => {
    setCenter(e.position)
  }

  const handleUserClassify = (
    e: Entreprise,
    newType: EntrepriseType
  ) => {
    const updated = { ...e, type: newType }
    setUserData(prev =>
      prev.map(x => x.siren === e.siren ? updated : x)
    )
    setMapData(prev =>
      prev.map(x => x.siren === e.siren ? updated : x)
    )
  }

  const handleUserRemove = (e: Entreprise) => {
    setUserData(prev => prev.filter(x => x.siren !== e.siren))
    setMapData(prev => prev.filter(x => x.siren !== e.siren))
  }

  const handleFilterSearch = async (filters: {
    nafCodes?: string[]
    activityId?: string
    employeesCategory: string
    radius: number
  }) => {
    let toastId: string | undefined;
    try {
      setFilterRadius(filters.radius);

      toastId = toast.loading('Recherche en cours...');

      let rows: Entreprise[];
      if (filters.nafCodes && filters.nafCodes.length) {
        const res = await fetch(`https://application-map.onrender.com/api/search-filters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nafs: filters.nafCodes,
            employeesCategory: filters.employeesCategory,
            radius: filters.radius,
            lng: center[0],
            lat: center[1],
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        rows = await res.json();
      } else {
        const params = new URLSearchParams({
          naf: filters.activityId || "",
          employeesCategory: filters.employeesCategory,
          radius: filters.radius.toString(),
          lng: center[0].toString(),
          lat: center[1].toString(),
        });
        const res = await fetch(
          `https://application-map.onrender.com/api/search-filters?${params}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        rows = await res.json();
      }

      const userSirenSet = new Set(userData.map(e => e.siren));
      const filteredRows = rows.filter(e => !userSirenSet.has(e.siren));

      setSearchHistory(filteredRows);
      setMapData([...userData, ...filteredRows]);
      if (filteredRows.length > 0) {
      toast.success(`Recherche terminée : ${filteredRows.length} résultat(s) trouvé(s)`, { id: toastId });
      } else {
        toast.error("Aucun résultat trouvé.", { id: toastId });
      }
      console.log('Recherche par filtres réussie', filteredRows);
    } catch (err) {
      toast.error('Recherche échouée.', { id: toastId });
      console.error('Recherche par filtres échouée :', err);
    }
  }

  const handleSearchSimilar = async (e: Entreprise) => {
    setCenter(e.position)
    toast.loading("Recherche de similaires en cours...", { id: "similar" });
    await handleFilterSearch({
      activityId: e.codeNAF,
      employeesCategory: "", // vide = toutes tailles, adapte si besoin
      radius: filterRadius,
    });
  }

  return (
    <div className="app">
      <Toaster />
      <Sidebar
        data={userData}
        onSelectEntreprise={handleSelectEntreprise}
        onClassify={handleUserClassify}
        onLocate={handleLocate}
        onRemove={handleUserRemove}
        onSearchSimilar={handleSearchSimilar}
        radius={filterRadius}
        onRadiusChange={setFilterRadius}
        onFilterSearch={handleFilterSearch}
      />

      <div className="main" style={{ position: "relative" }}>
        <Map
          data={mapData}
          center={center}
          filterRadius={filterRadius}
          onClickSetCenter={(lat, lng) => setCenter([lng, lat])}
        />

        <FloatingPanel
          data={searchHistory}
          onClassify={handleSearchClassify}
          onLocate={handleLocate}
          onRemove={handleSearchRemove}
        />

        <div
          style={{
            position: "absolute",
            top: 16,
            right: 32,
            zIndex: 1000,
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
            padding: "10px 20px",
          }}
        >
          <label
            style={{
              cursor: "pointer",
              color: "#3182ce",
              fontWeight: "bold"
            }}
          >
            Importer entreprises
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default App
