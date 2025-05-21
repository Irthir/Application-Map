// src/App.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import FloatingPanel from './components/FloatingPanel';
import Papa from 'papaparse';
import { Entreprise, EntrepriseType } from './type';
import './index.css';

const App: React.FC = () => {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const initialCenter: [number, number] = [2.3522, 48.8566];
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const filterRadius = 20;

  // Charger les données depuis le CSV nettoyé (public/Merged_SIRENE.csv)
  useEffect(() => {
    const csvPath = `${process.env.PUBLIC_URL || ''}/Merged_SIRENE.csv`;
    fetch(csvPath)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load CSV: ${res.status}`);
        return res.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          delimiter: ';',
          complete: ({ data }) => {
            const parsed: Entreprise[] = (data as any[])
              .map(row => {
                const [lng, lat] = (row.position as string)
                  .replace(/\[|\]/g, '')
                  .split(',')
                  .map(Number);
                return {
                  type: EntrepriseType.Recherche,
                  siren: row.siren,
                  name: row.name,
                  codeNAF: row.codeNAF,
                  employeesCategory: row.employeesCategory,
                  address: row.address,
                  position: [lng, lat] as [number, number],
                };
              })
              .filter(e => !!e.siren);
            setEntreprises(parsed);
            if (parsed.length > 0) {
              setCenter(parsed[0].position);
            }
          }
        });
      })
      .catch(err => {
        console.error('Erreur chargement CSV :', err);
      });
  }, []);

  const handleMapClick = (lat: number, lng: number) => setCenter([lng, lat]);
  const handleSelectEntreprise = (e: Entreprise) => setCenter(e.position);

  return (
    <div className="app">
      <Sidebar
        data={entreprises}
        onSelectEntreprise={handleSelectEntreprise}
      />
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
