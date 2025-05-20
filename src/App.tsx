import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Map from "./components/Map";
import FloatingPanel from "./components/FloatingPanel";
import { DataPoint } from "./type";
import { Toaster, toast } from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";

// Structure d'arborescence statique pour les filtres
const arborescenceData = [
  { code: "01", nom: "Culture et production animale", activites: ["Culture de céréales", "Culture de légumes", "Élevage de vaches laitières"] },
  { code: "02", nom: "Sylviculture et exploitation forestière", activites: ["Exploitation forestière", "Récolte de produits forestiers"] },
];
const industries = arborescenceData.flatMap((d) => d.activites);

const App = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number>(20);
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.35, 48.85]);
  const [hiddenMarkers, setHiddenMarkers] = useState<string[]>([]);

  // Chargement du cache
  useEffect(() => {
    const saved = localStorage.getItem("application-map-data");
    if (saved) {
      try {
        setData(JSON.parse(saved));
        toast.success("✅ Données récupérées depuis le cache");
      } catch {
        console.error("Échec du parsing du cache");
      }
    }
  }, []);

  // Sauvegarde du cache
  useEffect(() => {
    localStorage.setItem("application-map-data", JSON.stringify(data));
  }, [data]);

  // Recherche via API
  const handleSearch = useCallback((query: string) => {
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((results: any[]) => {
        const newPoints: DataPoint[] = results
          .filter((r) => typeof r.Latitude === "number" && typeof r.Longitude === "number")
          .map((r) => ({
            Nom: r.Nom || "Entreprise",
            Latitude: r.Latitude,
            Longitude: r.Longitude,
            Adresse: r.Adresse || "",
            Secteur: r.Secteur || "Non spécifié",
            CodeNAF: r.CodeNAF || "",
            Type: "Prospect",
            Distance: typeof r.Distance === 'number' ? r.Distance : Number(r.Distance) || undefined,
          }));
        setData((prev) => [...prev, ...newPoints]);
        toast.success(`✅ ${newPoints.length} point(s) ajouté(s)`);
      })
      .catch((err) => {
        console.error(err);
        toast.error("❌ Erreur lors de la recherche");
      });
  }, []);

  // Application des filtres (mise à jour du rayon)
  const handleFilter = useCallback(
    (filters: { businessName: string; industry: string; employees: string; radius: number }) => {
      setFilterRadius(filters.radius);
    },
    []
  );

  // Centrer la carte
  const handleCenterMap = (lat: number, lng: number) => {
    setMapCenter([lng, lat]);
  };

  // Supprimer un point
  const removeItem = (nom: string) => {
    setData((prev) => prev.filter((d) => d.Nom !== nom));
  };

  // Toggle visibilité marqueur
  const toggleVisibility = (nom: string) => {
    setHiddenMarkers((prev) =>
      prev.includes(nom) ? prev.filter((n) => n !== nom) : [...prev, nom]
    );
  };

  return (
    <div className="app-container">
      <Sidebar
        onSearch={handleSearch}
        onFilter={handleFilter}
        industries={industries}
      />

      <main className="map-container">
        <Map
          data={data}
          filterRadius={filterRadius}
          center={mapCenter}
          onClickSetCenter={handleCenterMap}
        />
        <FloatingPanel
          data={data}
          onCenter={handleCenterMap}
          onRemoveItem={removeItem}
          onToggleVisibility={toggleVisibility}
          hiddenMarkers={hiddenMarkers}
        />
        <Toaster position="top-center" />
      </main>
    </div>
  );
};

export default App;
