// src/App.tsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import FloatingPanel from './components/FloatingPanel';
import { Entreprise } from './type.ts';
import './index.css';

const dummyEntreprises: Entreprise[] = [ /* tes données dummy ou vide */ ];

const App: React.FC = () => {
  const entreprises = dummyEntreprises;  // ou laisse vide si tout vient du serveur
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566]);
  const filterRadius = 20;

  const handleMapClick = (lat: number, lng: number) => setCenter([lng, lat]);
  const handleSelectEntreprise = (e: Entreprise) => setCenter(e.position);

  return (
    <div className="app">
      <Sidebar onSelectEntreprise={handleSelectEntreprise} />
      <div className="main">
        <Map
          data={entreprises}
          center={center}
          filterRadius={filterRadius}
          onClickSetCenter={handleMapClick}
        />
        <FloatingPanel data={entreprises} />
      </div>
    </div>
  );
};

export default App;
