// App.tsx
import { useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

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

  const handleCenterMap = (lat: number, lon: number) => {
    setMapCenter([lon, lat]);
  };

  const toggleMarkerVisibility = (nom: string) => {
    setHiddenMarkers(prev =>
      prev.includes(nom) ? prev.filter(n => n !== nom) : [...prev, nom]
    );
  };

  const handleSearchResults = async (data: any) => {
    try {
      const label = data.denomination || "Lieu non nommé";
      const toGeocode = data.adresse || label;
      const geoData = await geocodeAddress(toGeocode);

      if (geoData.latitude && geoData.longitude) {
        const newEntry = {
          Nom: label,
          Latitude: geoData.latitude,
          Longitude: geoData.longitude,
          Type: "Recherche",
        };

        setData(prev => [...prev, newEntry]);
        centerMap(geoData.latitude, geoData.longitude);
      } else {
        alert("Aucune donnée géographique trouvée.");
      }
    } catch (error) {
      console.error("Erreur de géocodage ou récupération :", error);
      alert("Entreprise non localisée.");
    }
  };

  const centerMap = (lat: number, lng: number) => {
    setMapCenter([lng, lat]);
  };

  const handleSetType = (nom: string, type: "Client" | "Prospect" | "") => {
    setData(prev =>
      prev.map(item =>
        item.Nom === nom ? { ...item, Type: type } : item
      )
    );
  };

  const handleRemoveItem = (nom: string) => {
    setData(prev => prev.filter(item => item.Nom !== nom));
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
  };

  const geocodeAddress = async (address: string) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (!data.length) throw new Error("Adresse non trouvée");
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
/>


      <main className="map-container">
        <Map
          data={data.filter(item => !hiddenMarkers.includes(item.Nom))}
          filterRadius={filterRadius}
          center={mapCenter}
        />
      </main>
    </div>
  );
};

export default App;
