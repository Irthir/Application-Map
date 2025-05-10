import { useState, useEffect, useCallback } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import FloatingPanel from "./components/FloatingPanel";
import { DataPoint } from "./type";
import { Toaster, toast } from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

const LOCAL_STORAGE_KEY = "application-map-data";

const App = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number>(5); // Rayon de recherche
  const [hiddenMarkers, setHiddenMarkers] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.35, 48.85]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://application-map.onrender.com";

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

  // 🔄 Supprimer les anciens résultats de type "Recherche"
  const removeRechercheMarkers = () => {
    setData((prev) => prev.filter((d) => d.Type !== "Recherche"));
  };

  // 💾 Alerte fermeture si changements non sauvegardés
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsavedChanges]);

  // 🔎 Recherche similaire par événement personnalisé
  useEffect(() => {
    const handleSearchSimilar = async (e: Event) => {
      const { naf, lat, lng } = (e as CustomEvent<{
        naf: string;
        lat: number;
        lng: number;
      }>).detail;
      
      if (!naf || !lat || !lng) {
        toast.error("❗ Information manquante pour la recherche.");
        return;
      }

      removeRechercheMarkers();
      toast.loading(`🔎 Recherche d'entreprises similaires...`);

      try {
        const url = `${API_BASE}/api/bigquery-activite?naf=${encodeURIComponent(
          naf
        )}&lat=${lat}&lng=${lng}&radius=${filterRadius}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Erreur serveur");

        const entreprises = await res.json();
        handleSearchResults(entreprises);

        toast.dismiss();
        toast.success("✅ Entreprises similaires trouvées !");
      } catch (err) {
        console.error("Erreur recherche similaire :", err);
        toast.dismiss();
        toast.error("❗ Erreur lors de la recherche similaire.");
      }
    };

    window.addEventListener("search-similar", handleSearchSimilar);
    return () => window.removeEventListener("search-similar", handleSearchSimilar);
  }, [data, filterRadius]);

  // 📥 Traitement des résultats de recherche
  const handleSearchResults = useCallback((results: any[]) => {
    removeRechercheMarkers();

    const newEntries: DataPoint[] = results
      .filter((r) => typeof r.Latitude === "number" && typeof r.Longitude === "number")
      .map((r) => ({
        Nom: r.Nom !== "Entreprise" ? r.Nom : `${r.Secteur} (${r.CodeNAF})`,
        Latitude: r.Latitude,
        Longitude: r.Longitude,
        Adresse: r.Adresse || r.adresse || "",
        Secteur: r.Secteur || "Non spécifié",
        CodeNAF: r.CodeNAF || "",
        Type: "Recherche",
      }));

    if (newEntries.length) {
      setData((prev) => [...prev, ...newEntries]);
      autoCenter(newEntries);
      setUnsavedChanges(true);
      toast.success(`✅ ${newEntries.length} établissement(s) ajouté(s)`);
    } else {
      toast.error("❗ Aucun établissement trouvé.");
    }
  }, []);

  // 🎯 Centrage automatique
  const autoCenter = (entries: DataPoint[]) => {
    if (entries.length === 0) return;
    const avgLat = entries.reduce((sum, e) => sum + e.Latitude, 0) / entries.length;
    const avgLon = entries.reduce((sum, e) => sum + e.Longitude, 0) / entries.length;
    setMapCenter([avgLon, avgLat]);
    setFilterRadius(5);
  };

  // 🗺️ Carte : centrage et filtres
  const handleCenterMap = (lat: number, lon: number) => {
    setMapCenter([lon, lat]);
    setFilterRadius(5);
  };

  const toggleMarkerVisibility = (nom: string) => {
    setHiddenMarkers((prev) =>
      prev.includes(nom) ? prev.filter((n) => n !== nom) : [...prev, nom]
    );
  };

  const handleSetType = (nom: string, type: "Client" | "Prospect") => {
    setData((prev) => prev.map((d) => (d.Nom === nom ? { ...d, Type: type } : d)));
    setUnsavedChanges(true);
  };

  const handleRemoveItem = (nom: string) => {
    setData((prev) => prev.filter((d) => d.Nom !== nom));
    setUnsavedChanges(true);
  };

  // 🔄 Effacer le cache
  const clearCache = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setData([]);
    toast.success("🗑️ Cache vidé avec succès !");
  };

  return (
    <div className="app-container">
      <Sidebar
        data={data}
        onUpload={setData}
        onSearchResults={handleSearchResults}
        onCenter={handleCenterMap}
        onToggleVisibility={toggleMarkerVisibility}
        hiddenMarkers={hiddenMarkers}
        onSetType={handleSetType}
        onRemoveItem={handleRemoveItem}
        mapCenter={mapCenter}
        filterRadius={filterRadius} // Passer filterRadius dans Sidebar
        setFilterRadius={setFilterRadius} // Passer la fonction setFilterRadius ici
        onClearRecherche={removeRechercheMarkers}
        onClearCache={clearCache}
        onFilter={setFilterRadius} // Passer la fonction pour ajuster le rayon
      />

      <main className="map-container">
        <Map
          data={data.filter((d) => !hiddenMarkers.includes(d.Nom))}
          center={mapCenter}
          filterRadius={filterRadius} // Passer le radius à Map
          onClickSetCenter={(lat, lon) => handleCenterMap(lat, lon)}
        />
        <FloatingPanel
          data={data}
          onCenter={handleCenterMap}
          onRemoveItem={handleRemoveItem}
          onToggleVisibility={toggleMarkerVisibility}
          hiddenMarkers={hiddenMarkers}
          filterRadius={filterRadius} // Passer filterRadius ici
          onFilter={setFilterRadius} // Passer la fonction pour ajuster le radius
        />
        <Toaster position="top-center" />
      </main>
    </div>
  );
};

export default App;
