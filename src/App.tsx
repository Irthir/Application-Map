import { useState, useEffect, useCallback } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import FloatingPanel from "./components/FloatingPanel";
import { DataPoint } from "./type";
import { Toaster, toast } from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

const LOCAL_STORAGE_KEY = "application-map-data";

// Fonction de calcul de distance (Haversine) entre deux points (latitude, longitude)
/*const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};*/

const App = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number>(5); // Rayon de recherche
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.35, 48.85]);
  const [hiddenMarkers, setHiddenMarkers] = useState<string[]>([]);

  // 🚀 Chargement des données depuis le cache local
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setData(parsedData);
        toast.success("✅ Données récupérées depuis le cache");
      } catch (error) {
        console.error("❌ Erreur lors du chargement du cache :", error);
      }
    }
  }, []);

  // 💾 Mise à jour du cache lors de chaque modification
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // 📥 Traitement des résultats de recherche
  const handleSearchResults = useCallback((results: any[]) => {
    const newEntries: DataPoint[] = results
      .filter((r) => typeof r.Latitude === "number" && typeof r.Longitude === "number")
      .map((r) => {
        return {
          Nom: r.Nom || "Entreprise",
          Latitude: r.Latitude,
          Longitude: r.Longitude,
          Adresse: r.Adresse || r.adresse || "",
          Secteur: r.Secteur || "Non spécifié",
          CodeNAF: r.CodeNAF || "",
          SIREN: r.SIREN || "",  // Assurez-vous d'inclure le SIREN
          Type: "Recherche",
        };
      });

    setData((prev) => [...prev, ...newEntries]);
    if (newEntries.length === 0) {
      toast.error("❗ Aucun établissement trouvé.");
    } else {
      toast.success(`✅ ${newEntries.length} établissement(s) ajouté(s)`);
    }
  }, []);

  // 🗺️ Carte : centrage et filtres
  const handleCenterMap = (lat: number, lon: number) => {
    setMapCenter([lon, lat]);
    setFilterRadius(5);
  };

  // Toggle de visibilité pour les markers
  const toggleVisibility = (nom: string) => {
    setHiddenMarkers((prev) => 
      prev.includes(nom) ? prev.filter((n) => n !== nom) : [...prev, nom]
    );
  };

  // Fonction pour supprimer un item
  const removeItem = (nom: string) => {
    setData((prev) => prev.filter((d) => d.Nom !== nom));
  };

  return (
    <div className="app-container">
      <Sidebar
        data={data}
        onUpload={setData}
        onSearchResults={handleSearchResults}
        mapCenter={mapCenter}
        filterRadius={filterRadius}
        setFilterRadius={setFilterRadius}
        onClearRecherche={() => setData(data.filter((d) => d.Type !== "Recherche"))}
        onClearCache={() => {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setData([]);
        }}
        onCenter={handleCenterMap}
        onToggleVisibility={toggleVisibility}
        hiddenMarkers={hiddenMarkers}
        onSetType={() => {}}
        onRemoveItem={removeItem}
        onFilter={() => {}}
      />

      <main className="map-container">
        <Map
          data={data}
          center={mapCenter}
          filterRadius={filterRadius}
          onClickSetCenter={handleCenterMap}
        />
        <FloatingPanel
          data={data}
          onCenter={handleCenterMap}
          onRemoveItem={removeItem}
          onToggleVisibility={toggleVisibility}
          hiddenMarkers={hiddenMarkers}
          filterRadius={filterRadius}
          onFilter={setFilterRadius}
        />
        <Toaster position="top-center" />
      </main>
    </div>
  );
};

export default App;
