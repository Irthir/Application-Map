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

  // 1) Sélection dans la FloatingPanel → ajoute à la recherche et au map
  const handleSelectEntreprise = (e: Entreprise) => {
    setCenter(e.position);
    setSearchHistory(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    );
    setMapData(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    );
  };

  // 2a) Classification depuis FloatingPanel → passe dans userData, mapData et l'enlève de searchHistory
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

  // 2b) Suppression depuis FloatingPanel → enlève juste de searchHistory
  const handleSearchRemove = (e: Entreprise) => {
    setSearchHistory(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
  };

  // 3a) Classification depuis Sidebar → change le type dans userData et mapData
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

  // 3b) Suppression depuis Sidebar → retire de userData et mapData
  const handleUserRemove = (e: Entreprise) => {
    setUserData(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
    setMapData(prev =>
      prev.filter(x => x.siren !== e.siren)
    );
  };

  // Recentrage manuel sur la carte
  const handleLocate = (e: Entreprise) => {
    setCenter(e.position);
  };

  // Clic direct sur la carte  
  const handleMapClick = (lat: number, lng: number) => {
    setCenter([lng, lat]);
  };

  // Nouvelle recherche par filtres (NAF, effectifs, rayon)
  const handleFilterSearch = async (filters: {
    naf: string;
    employeesCategory: string;
    radius: number;
  }) => {
    const { naf, employeesCategory, radius } = filters;
    // On passe aussi le centre actuel pour la requête spatiale
    const [lng, lat] = center;
    try {
      const params = new URLSearchParams({
        naf,
        employeesCategory,
        radius: radius.toString(),
        lat: lat.toString(),
        lng: lng.toString(),
      });
      const res = await fetch(`https://application-map.onrender.com/api/searchCategory?${params}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const rows: Entreprise[] = await res.json();
      // parser positions si besoin
      const parsed = rows.map(e => {
        if (typeof e.position === 'string') {
          const [plng, plat] = (e.position as string)
            .replace(/[\[\]\s]/g, '')
            .split(',')
            .map(Number);
          return { ...e, position: [plng, plat] as [number, number] };
        }
        return e;
      });
      // on ajoute ces résultats à searchHistory et mapData
      setSearchHistory(prev =>
        [...prev, ...parsed.filter(e => !prev.some(x => x.siren === e.siren))]
      );
      setMapData(prev =>
        [...prev, ...parsed.filter(e => !prev.some(x => x.siren === e.siren))]
      );
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
        onFilterSearch={handleFilterSearch}   // ← nouveau
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
