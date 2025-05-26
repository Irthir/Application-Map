// src/App.tsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import FloatingPanel from './components/FloatingPanel';
import { Entreprise, EntrepriseType } from './type';
import './index.css';

const App: React.FC = () => {
  // Tous les marqueurs sur la carte
  const [mapData, setMapData] = useState<Entreprise[]>([]);
  // Résultats de recherche non classés
  const [searchHistory, setSearchHistory] = useState<Entreprise[]>([]);
  // Données classifiées (clients/prospects)
  const [userData, setUserData] = useState<Entreprise[]>([]);
  // Centre de la carte
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566]);
  const filterRadius = 20;

  // 1) Sélection depuis recherche textuelle
  const handleSelectEntreprise = (e: Entreprise) => {
    setCenter(e.position);
    setSearchHistory(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    );
    setMapData(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    );
  };

  // 2a) Classification depuis FloatingPanel
  const handleSearchClassify = (e: Entreprise, newType: EntrepriseType) => {
    const classified = { ...e, type: newType };
    setUserData(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, classified]
    );
    setMapData(prev =>
      prev.some(x => x.siren === e.siren)
        ? prev.map(x => x.siren === e.siren ? classified : x)
        : [...prev, classified]
    );
    setSearchHistory(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
  };

  // 2b) Suppression depuis FloatingPanel
  const handleSearchRemove = (e: Entreprise) => {
    setSearchHistory(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
  };

  // 3a) Classification depuis Sidebar
  const handleUserClassify = (e: Entreprise, newType: EntrepriseType) => {
    setUserData(prev =>
      prev.map(x =>
        x.siren === e.siren ? { ...x, type: newType } : x
      )
    );
    setMapData(prev =>
      prev.map(x =>
        x.siren === e.siren ? { ...x, type: newType } : x
      )
    );
  };

  // 3b) Suppression depuis Sidebar
  const handleUserRemove = (e: Entreprise) => {
    setUserData(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
    setMapData(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
  };

  // 4) Recentrage manuel depuis Sidebar ou FloatingPanel
  const handleLocate = (e: Entreprise) => {
    setCenter(e.position);
  };

  // 5) Clic direct sur la carte
  const handleMapClick = (lat: number, lng: number) => {
    setCenter([lng, lat]);
  };

  // 6) Recherche par filtres (NAF, effectifs, rayon)
  const handleFilterSearch = async (filters: {
    naf: string;
    employeesCategory: string;
    radius: number;
  }) => {
    const { naf, employeesCategory, radius } = filters;
    const params = new URLSearchParams({
      naf,
      employeesCategory,
      radius: radius.toString(),
      lng: center[0].toString(),
      lat: center[1].toString(),
    });

    try {
      const res = await fetch(
        `https://application-map.onrender.com/api/search-filters?${params}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: Entreprise[] = await res.json();
      // On remplace l'historique et les marqueurs par ces résultats filtrés
      setSearchHistory(rows);
      setMapData(rows);
    } catch (err) {
      console.error('Recherche par filtres échouée :', err);
    }
  };

  return (
    <div className="app">
      <Sidebar
        data={userData}
        onSelectEntreprise={handleSelectEntreprise}
        onClassify={handleUserClassify}
        onLocate={handleLocate}
        onRemove={handleUserRemove}
        onFilterSearch={handleFilterSearch}
      />

      <div className="main">
        <Map
          data={mapData}
          center={center}
          filterRadius={filterRadius}
          onClickSetCenter={handleMapClick}
        />

        <FloatingPanel
          data={searchHistory}
          onClassify={handleSearchClassify}
          onLocate={handleLocate}
          onRemove={handleSearchRemove}
        />
      </div>
    </div>
  );
};

export default App;
