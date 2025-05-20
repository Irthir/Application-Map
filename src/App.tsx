import React, { useState } from 'react';
import Sidebar, { FilterValues } from './components/Sidebar';
import Map from './components/Map';
import FloatingPanel from './components/FloatingPanel';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Entreprise, EntrepriseType } from './type.ts';
import './index.css';

const dummyEntreprises: Entreprise[] = [
  {
    type: EntrepriseType.Prospect,
    name: 'Aubefeuille',
    codeNAF: '41.20A',
    siren: '123456789',
    employeesCategory: '10-49',
    address: '54 Rue Mazarine, Paris',
    position: [2.3488, 48.8534],
  },
  {
    type: EntrepriseType.Client,
    name: 'Aube–Lo Jungle',
    codeNAF: '62.01Z',
    siren: '987654321',
    employeesCategory: '50-99',
    address: '5 Imp. des Acacias, Paris',
    position: [2.3500, 48.8528],
  },
  {
    type: EntrepriseType.Prospect,
    name: 'Aube–Air',
    codeNAF: '51.10Z',
    siren: '192837465',
    employeesCategory: '1-9',
    address: '140 Av. Victor Hugo, Paris',
    position: [2.3490, 48.8540],
  },
];

const App: React.FC = () => {
  const [entreprises, setEntreprises] = useState<Entreprise[]>(dummyEntreprises);
  const [center, setCenter] = useState<[number, number]>(dummyEntreprises[0].position);
  const [filterRadius, setFilterRadius] = useState<number>(20);

  const handleMapClick = (lat: number, lng: number) => setCenter([lng, lat]);

  const handleApplyFilters = (filters: FilterValues) => {
    const results = dummyEntreprises.filter(e =>
      e.name.toLowerCase().includes(filters.name.toLowerCase())
    );
    setEntreprises(results);
    setFilterRadius(filters.radius);
    toast.success('Filtres appliqués');
  };

  return (
    <div className="app">
      <Sidebar onApplyFilters={handleApplyFilters} />
      <div className="main">
        <Map
          data={entreprises}
          center={center}
          filterRadius={filterRadius}
          onClickSetCenter={handleMapClick}
        />
        <FloatingPanel data={entreprises} />
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default App;