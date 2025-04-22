// App.tsx
import { useEffect, useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";
import ImportCSV from "./components/Import";

interface DataPoint {
  Nom: string;
  Latitude: number;
  Longitude: number;
  Type: string;
}

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
    const listener = async (e: any) => {
      const selected = data.find(d => d.Nom === e.detail);
      if (selected) {
        const nafCode = prompt("Code NAF à rechercher ? (par ex : 62.01Z)", "62.01Z");
        if (!nafCode) return;

        try {
          const res = await fetch(
            `http://localhost:5000/api/insee-activite?naf=${encodeURIComponent(
              nafCode
            )}&lat=${selected.Latitude}&lng=${selected.Longitude}&radius=${filterRadius || 10}`
          );
          const entreprises = await res.json();
          handleSearchResults(entreprises);
        } catch (err) {
          console.error("Erreur lors de la recherche similaire :", err);
        }
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

    for (const data of results) {
      try {
        const label = data.Nom || "Entreprise";
        const address = data.adresse;

        if (!address || address.trim() === "") {
          console.warn("❌ Aucune adresse à géocoder :", data);
          continue;
        }

        const toGeocode = `${address}, France`;
        const geoData = await geocodeAddress(toGeocode);

        if (geoData.latitude && geoData.longitude) {
          const newEntry = {
            Nom: label,
            Latitude: geoData.latitude,
            Longitude: geoData.longitude,
            Type: "Recherche",
          };

          setData(prev => [...prev, newEntry]);
          setUnsavedChanges(true);
        }
      } catch (error) {
        console.error("Erreur de géocodage ou récupération :", error);
      }
    }

    if (results.length > 0) {
      const first = results[0];
      const geoData = await geocodeAddress(`${first.adresse}, France`);
      setMapCenter([geoData.longitude, geoData.latitude]);
    }
  };

  const handleSetType = (nom: string, type: "Client" | "Prospect" | "") => {
    setData(prev =>
      prev.map(item =>
        item.Nom === nom ? { ...item, Type: type } : item
      )
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
      alert("Aucune donnée marquée à exporter.");
      return;
    }

    const csvContent = [
      ["Nom", "Latitude", "Longitude", "Type"],
      ...markedData.map(({ Nom, Latitude, Longitude, Type }) => [
        Nom, Latitude.toString(), Longitude.toString(), Type,
      ]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "export_donnees.csv");
    link.click();

    setUnsavedChanges(false);
  };

  const geocodeAddress = async (address: string) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MaSuperApp/1.0 (contact@exemple.com)',
      }
    });

    if (!res.ok) {
      throw new Error(`Erreur réseau : ${res.status}`);
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      throw new Error("Adresse non trouvée");
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  };

  const handleUpload = (uploadedData: any[]) => {
    const formatted = uploadedData.map((item) => ({
      Nom: item.Nom,
      Latitude: parseFloat(item.Latitude),
      Longitude: parseFloat(item.Longitude),
      Type: item.Type,
    }));
    setData(formatted);
    setUnsavedChanges(false);
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
      </main>
    </div>
  );
};

export default App;
