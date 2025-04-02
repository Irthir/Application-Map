import { useState } from "react";
import Map from "./components/Map";
import Auth from "./components/Auth";
import Filter from "./components/Filtre";
import ImportCSV from "./components/Import";
import SearchAPE from "./components/SearchAPE";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

interface DataPoint {
  Nom: string;
  Latitude: number;
  Longitude: number;
  Type: string;
}

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number | null>(null);
  const [inseeData, setInseeData] = useState<DataPoint | null>(null); // ✅ Correction ici

  const handleSearchResults = async (data: any) => {
    console.log("Résultats APE :", data);
    if (data && data.siren) {
      try {
        const { latitude, longitude } = await geocodeAddress(data.denomination || "France");
        if (!latitude || !longitude) throw new Error("Coordonnées invalides.");
        
        setInseeData({  // ✅ Correction ici : assigner un objet et non un tableau
          Nom: data.denomination || "Nom inconnu",
          Latitude: latitude,
          Longitude: longitude,
          Type: "Entreprise",
        });

      } catch (error) {
        console.error("Erreur de géocodage :", error);
        alert("Impossible de localiser cette entreprise sur la carte.");
        setInseeData(null); // ✅ Correction ici (remettre à null)
      }
    }
  };

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data.length === 0) throw new Error("Adresse non trouvée");
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } catch (error) {
      console.error("Erreur lors du géocodage :", error);
      throw error;
    }
  };

  const handleUpload = (uploadedData: any[]) => {
    const formattedData = uploadedData.map((item) => ({
      Nom: item.Nom,
      Latitude: parseFloat(item.Latitude),
      Longitude: parseFloat(item.Longitude),
      Type: item.Type,
    }));
    setData(formattedData);
  };

  const handleFilter = (radius: number) => {
    setFilterRadius(radius);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="p-4 space-y-4">
      {!isLoggedIn ? (
        <div>
          <h2>Connexion</h2>
          <Auth />
          <button onClick={handleLoginSuccess} className="mt-2 p-2 bg-blue-500 text-white rounded">Simuler Connexion</button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div><h2>Importer des données</h2><ImportCSV onUpload={handleUpload} /></div>
          <div><h2>Filtrer les données</h2><Filter onFilter={handleFilter} /></div>
          <div><h2>Recherche APE</h2><SearchAPE onResults={handleSearchResults} /></div>
          <div>
            <h2>Données Importées</h2>
            <ul>{data.map((item, index) => (
              <li key={index}>{item.Nom} - {item.Type} ({item.Latitude}, {item.Longitude})</li>
            ))}</ul>
          </div>
          <div>
            <h2>Carte</h2>
            <Map data={[...data, ...(inseeData ? [inseeData] : [])]} filterRadius={filterRadius} /> {/* ✅ Correction ici */}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
