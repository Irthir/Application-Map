import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Map from "./components/Map";
import FloatingPanel from "./components/FloatingPanel";
import { DataPoint } from "./type";
import { Toaster, toast } from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";

// Exemple de structure d'arborescence statique
const arborescenceData = [
  {
    code: "01",
    nom: "Culture et production animale",
    activites: [
      "Culture de céréales",
      "Culture de légumes",
      "Élevage de vaches laitières"
    ]
  },
  {
    code: "02",
    nom: "Sylviculture et exploitation forestière",
    activites: [
      "Exploitation forestière",
      "Récolte de produits forestiers"
    ]
  },
  // Ajoutez plus de divisions et d'activités ici si nécessaire
];

const LOCAL_STORAGE_KEY = "application-map-data";

const App = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [filterRadius, setFilterRadius] = useState<number>(5); // Rayon de recherche
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.35, 48.85]);
  const [hiddenMarkers, setHiddenMarkers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Recherche" | "Clients" | "Prospects">("Recherche"); // Onglet actif
  const [arborescence] = useState<any[]>(arborescenceData); // Structure des divisions et activités

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
          Type: "Recherche",  // Initialement type "Recherche"
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

  // Fonction pour mettre à jour le type d'une entreprise
  const handleSetType = (nom: string, type: "Client" | "Prospect") => {
    setData((prev) =>
      prev.map((d) =>
        d.Nom === nom ? { ...d, Type: type } : d // Met à jour le type de l'entreprise
      )
    );
  };

  // Fonction pour ajuster le rayon de recherche
  const handleFilterRadiusChange = (radius: number) => {
    setFilterRadius(radius);
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
        onSetType={handleSetType}
        onRemoveItem={removeItem}
        arborescence={arborescence} // Passer l'arborescence
        onFilter={handleFilterRadiusChange} // Passez la fonction onFilter
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
          activeTab={activeTab} // Passer l'onglet actif à FloatingPanel
          setActiveTab={setActiveTab} // Passer la fonction pour changer l'onglet
        />
        <Toaster position="top-center" />
      </main>
    </div>
  );
};

export default App;
