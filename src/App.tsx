import { useEffect, useState, useCallback } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import ImportCSV from "./components/Import";
import { DataPoint } from "./type.ts";
import { Toaster, toast } from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

const App = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number>(5); // 🔵 valeur par défaut à 5km
  const [hiddenMarkers, setHiddenMarkers] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.35, 48.85]); // Paris
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // 💾 Alerte de fermeture si des changements non sauvegardés
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

  // 🔎 Écouteur pour rechercher des entreprises similaires
  useEffect(() => {
    const handleSearchSimilar = async (e: Event) => {
      const { nom, naf } = (e as CustomEvent<{ nom: string; naf: string }>).detail;
      const selected = data.find(d => d.Nom === nom);

      if (!selected || !naf) {
        toast.error(selected ? "❗ Secteur non défini." : "❗ Entreprise introuvable.");
        return;
      }

      try {
        const res = await fetch(
          `https://application-map.onrender.com/api/insee-activite?naf=${encodeURIComponent(naf)}&lat=${selected.Latitude}&lng=${selected.Longitude}&radius=${filterRadius}`
        );
        if (!res.ok) throw new Error("Erreur serveur");

        const entreprises = await res.json();
        handleSearchResults(entreprises);
      } catch (err) {
        console.error("Erreur recherche similaire :", err);
        toast.error("❗ Erreur recherche similaire.");
      }
    };

    window.addEventListener("search-similar", handleSearchSimilar);
    return () => window.removeEventListener("search-similar", handleSearchSimilar);
  }, [data, filterRadius]);

  // 📌 Gérer les nouveaux résultats de recherche
  const handleSearchResults = useCallback(async (results: any[]) => {
    removeRechercheMarkers();

    const newEntries: DataPoint[] = results
      .filter(r => typeof r.Latitude === "number" && typeof r.Longitude === "number")
      .map(r => ({
        Nom: r.Nom || "Entreprise",
        Latitude: r.Latitude,
        Longitude: r.Longitude,
        Adresse: r.adresse || "",
        Secteur: r.secteur || "",
        CodeNAF: r.codeNAF || "",
        Type: r.Type || "Recherche",
      }));

    if (newEntries.length) {
      setData(prev => [...prev, ...newEntries]);
      autoCenter(newEntries);
      setUnsavedChanges(true);
      toast.success(`✅ ${newEntries.length} établissement(s) ajouté(s)`);
    } else {
      toast.error("❗ Aucun établissement trouvé.");
    }
  }, []);

  // 🎯 Centrage automatique des marqueurs
  const autoCenter = (entries: DataPoint[]) => {
    if (!entries.length) return;
    const avgLat = entries.reduce((sum, e) => sum + e.Latitude, 0) / entries.length;
    const avgLon = entries.reduce((sum, e) => sum + e.Longitude, 0) / entries.length;
    setMapCenter([avgLon, avgLat]);
  };

  // 🗺️ Actions sur la carte
  const handleCenterMap = (lat: number, lon: number) => setMapCenter([lon, lat]);
  const toggleMarkerVisibility = (nom: string) => {
    setHiddenMarkers(prev =>
      prev.includes(nom) ? prev.filter(n => n !== nom) : [...prev, nom]
    );
  };

  // 🗑️ Nettoyage des résultats "Recherche"
  const removeRechercheMarkers = () => {
    setData(prev => prev.filter(d => d.Type !== "Recherche"));
  };

  // 💾 Marquer un client ou prospect
  const handleSetType = (nom: string, type: "Client" | "Prospect" | "") => {
    setData(prev => prev.map(d => d.Nom === nom ? { ...d, Type: type } : d));
    setUnsavedChanges(true);
  };

  // ❌ Suppression d'une entreprise
  const handleRemoveItem = (nom: string) => {
    setData(prev => prev.filter(d => d.Nom !== nom));
    setUnsavedChanges(true);
  };

  // 📥 Import CSV
  const handleUpload = (uploadedData: any[]) => {
    const formatted = uploadedData.map((item) => ({
      Nom: item.Nom,
      Latitude: parseFloat(item.Latitude),
      Longitude: parseFloat(item.Longitude),
      Type: item.Type || "",
      Adresse: item.Adresse || "",
      Secteur: item.Secteur || "",
      CodeNAF: item.CodeNAF || "",
    }));
    setData(formatted);
    setUnsavedChanges(false);
    toast.success(`✅ ${formatted.length} entrée(s) importée(s)`);
  };

  // 📤 Export CSV
  const handleExport = () => {
    const markedData = data.filter(d => d.Type === "Client" || d.Type === "Prospect");
    if (!markedData.length) {
      toast.error("❗ Aucune donnée marquée à exporter.");
      return;
    }

    const csvContent = [
      ["Nom", "Latitude", "Longitude", "Type", "Adresse", "Secteur", "CodeNAF"],
      ...markedData.map(d => [d.Nom, d.Latitude, d.Longitude, d.Type, d.Adresse, d.Secteur, d.CodeNAF])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export_donnees.csv";
    link.click();

    setUnsavedChanges(false);
    toast.success("✅ Export CSV effectué !");
  };

  // 📥 Télécharger un modèle vide
  const handleDownloadTemplate = () => {
    const csvContent = "Nom,Latitude,Longitude,Type,Adresse,Secteur,CodeNAF\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_import.csv";
    link.click();
    toast.success("✅ Modèle CSV téléchargé !");
  };

  return (
    <div className="app-container">
      <Sidebar
        data={data}
        onUpload={handleUpload}
        onFilter={setFilterRadius}
        onSearchResults={handleSearchResults}
        onCenter={handleCenterMap}
        onToggleVisibility={toggleMarkerVisibility}
        hiddenMarkers={hiddenMarkers}
        onSetType={handleSetType}
        onExport={handleExport}
        onDownloadTemplate={handleDownloadTemplate}
        onRemoveItem={handleRemoveItem}
        mapCenter={mapCenter}
        filterRadius={filterRadius}
        setFilterRadius={setFilterRadius}
        onClearRecherche={removeRechercheMarkers}
      />
      <main className="map-container">
        <Map
          data={data.filter(d => !hiddenMarkers.includes(d.Nom))}
          center={mapCenter}
          filterRadius={filterRadius}
          onClickSetCenter={(lat, lon) => setMapCenter([lon, lat])}
        />
        <div className="import-button-overlay">
          <ImportCSV onUpload={handleUpload} />
        </div>
        <Toaster position="top-center" reverseOrder={false} />
      </main>
    </div>
  );
};

export default App;
