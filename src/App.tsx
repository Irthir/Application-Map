import { useEffect, useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";
import ImportCSV from "./components/Import";
import { DataPoint } from "./type.ts";
import { Toaster, toast } from 'react-hot-toast';

const App = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number | null>(null);
  const [hiddenMarkers, setHiddenMarkers] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.35, 48.85]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = "Vous avez des modifications non sauvegardées.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsavedChanges]);

  useEffect(() => {
    const listener = async (e: Event) => {
      const customEvent = e as CustomEvent<{ nom: string; naf: string }>;
      const selected = data.find(d => d.Nom === customEvent.detail.nom);
      if (!selected) {
        toast.error("❗ Entreprise sélectionnée introuvable.");
        return;
      }
      const nafCode = customEvent.detail.naf;
      if (!nafCode) {
        toast.error("❗ Secteur d’activité non défini.");
        return;
      }

      try {
        const res = await fetch(
          `https://application-map.onrender.com/api/insee-activite?naf=${encodeURIComponent(nafCode)}&lat=${selected.Latitude}&lng=${selected.Longitude}&radius=${filterRadius || 10}`
        );
        if (!res.ok) throw new Error("Erreur serveur");
        const entreprises = await res.json();
        await handleSearchResults(entreprises);
      } catch (err) {
        console.error("Erreur lors de la recherche similaire :", err);
        toast.error("❗ Erreur lors de la recherche de secteurs similaires.");
      }
    };

    window.addEventListener("search-similar", listener);
    return () => window.removeEventListener("search-similar", listener);
  }, [data, filterRadius]);

  const handleCenterMap = (lat: number, lon: number) => {
    setMapCenter([lon, lat]);
  };

  const toggleMarkerVisibility = (nom: string) => {
    setHiddenMarkers(prev =>
      prev.includes(nom) ? prev.filter(n => n !== nom) : [...prev, nom]
    );
  };

  const removeRechercheMarkers = () => {
    setData(prev => prev.filter(item => item.Type !== "Recherche"));
  };

  const handleSearchResults = async (results: any[]) => {
    removeRechercheMarkers();
    const newEntries: DataPoint[] = [];

    for (const entry of results) {
      try {
        const nom = entry.Nom || "Entreprise";
        const hasCoords = typeof entry.Latitude === "number" && typeof entry.Longitude === "number";

        if (hasCoords) {
          newEntries.push({
            Nom: nom,
            Latitude: entry.Latitude,
            Longitude: entry.Longitude,
            Adresse: entry.adresse || "",
            Secteur: entry.secteur || "",
            CodeNAF: entry.codeNAF || "",
            Type: entry.Type || "Recherche",
          });
        }
      } catch (error) {
        console.error("Erreur traitement résultat :", error);
      }
    }

    if (newEntries.length > 0) {
      setData(prev => [...prev, ...newEntries]);
      autoCenter(newEntries);
      setUnsavedChanges(true);
      toast.success(`✅ ${newEntries.length} établissement(s) trouvé(s) et ajouté(s)`);
    } else {
      toast.error("❗ Aucun établissement trouvé correspondant à votre recherche.");
    }
  };

  // 🧠 Nouvelle fonction : centre automatiquement sur le milieu des nouveaux points
  const autoCenter = (entries: DataPoint[]) => {
    if (entries.length === 1) {
      setMapCenter([entries[0].Longitude, entries[0].Latitude]);
    } else {
      const avgLat = entries.reduce((sum, e) => sum + e.Latitude, 0) / entries.length;
      const avgLon = entries.reduce((sum, e) => sum + e.Longitude, 0) / entries.length;
      setMapCenter([avgLon, avgLat]);
    }
  };

  const handleSetType = (nom: string, type: "Client" | "Prospect" | "") => {
    setData(prev =>
      prev.map(item => item.Nom === nom ? { ...item, Type: type } : item)
    );
    setUnsavedChanges(true);
  };

  const handleRemoveItem = (nom: string) => {
    setData(prev => prev.filter(item => item.Nom !== nom));
    setUnsavedChanges(true);
  };

  const handleExport = () => {
    const markedData = data.filter(d => d.Type === "Client" || d.Type === "Prospect");
    if (markedData.length === 0) {
      toast.error("❗ Aucune donnée marquée à exporter.");
      return;
    }

    const csvContent = [
      ["Nom", "Latitude", "Longitude", "Type", "Adresse", "Secteur", "CodeNAF"],
      ...markedData.map(({ Nom, Latitude, Longitude, Type, Adresse = "", Secteur = "", CodeNAF = "" }) => [
        Nom, Latitude.toString(), Longitude.toString(), Type, Adresse, Secteur, CodeNAF,
      ]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "export_donnees.csv");
    link.click();

    setUnsavedChanges(false);
    toast.success("✅ Export CSV effectué !");
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Nom,Latitude,Longitude,Type,Adresse,Secteur,CodeNAF\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_import.csv");
    link.click();
    toast.success("✅ Modèle CSV téléchargé !");
  };

  const handleUpload = (uploadedData: any[]) => {
    const formatted = uploadedData.map((item) => ({
      Nom: item.Nom,
      Latitude: parseFloat(item.Latitude),
      Longitude: parseFloat(item.Longitude),
      Type: item.Type,
      Adresse: item.Adresse || "",
      Secteur: item.Secteur || "",
      CodeNAF: item.CodeNAF || "",
    }));
    setData(formatted);
    setUnsavedChanges(false);
    toast.success(`✅ ${formatted.length} entrée(s) importée(s)`);
  };

  const handleFilter = (radius: number) => {
    setFilterRadius(radius);
  };

  return (
    <div className="app-container">
      <Sidebar
        data={data}
        onUpload={handleUpload}
        onFilter={handleFilter}
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
          data={data.filter(item => !hiddenMarkers.includes(item.Nom))}
          filterRadius={filterRadius}
          center={mapCenter}
          onClickSetCenter={(lat, lng) => setMapCenter([lng, lat])}
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
