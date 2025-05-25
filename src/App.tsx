import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import FloatingPanel from './components/FloatingPanel';
import { Entreprise } from './type.ts';
import './index.css';

const App: React.FC = () => {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566]);
  const filterRadius = 20;

  useEffect(() => {
    fetch('https://application-map.onrender.com/api/all')
      .then(res => {
        if (!res.ok) throw new Error(`API /all failed: ${res.status}`);
        return res.json();
      })
      .then((raw: Entreprise[]) => {
        // Parser position string => [lng, lat]
        const data = raw
          .map(e => {
            if (typeof e.position === 'string') {
              const [lng, lat] = (e.position as string)
                .replace(/[\[\]\s]/g, '')
                .split(',')
                .map(Number);
              return { ...e, position: [lng, lat] as [number, number] };
            }
            return e;
          });
        setEntreprises(data);
        if (data.length) setCenter(data[0].position);
      })
      .catch(err => console.error('Erreur chargement /api/all :', err));
  }, []);

  const handleSelectEntreprise = (e: Entreprise) => {
    setCenter(e.position);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCenter([lng, lat]);
  };

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
