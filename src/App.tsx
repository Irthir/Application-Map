// src/App.tsx
import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Map from './components/Map'
import FloatingPanel from './components/FloatingPanel'
import { Entreprise, EntrepriseType } from './type'
import './index.css'

const App: React.FC = () => {
  // Tous les marqueurs sur la carte
  const [mapData, setMapData] = useState<Entreprise[]>([])
  // Résultats de recherche non classés (affichés en FloatingPanel)
  const [searchHistory, setSearchHistory] = useState<Entreprise[]>([])
  // Centre de la carte
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566])
  // Rayon de filtre utilisé pour dessiner le cercle sur la carte
  const [filterRadius, setFilterRadius] = useState<number>(20)

  // 1) Sélection depuis la recherche textuelle dans la sidebar
  const handleSelectEntreprise = (e: Entreprise) => {
    setCenter(e.position)
    setSearchHistory(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    )
    setMapData(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    )
  }

  // 2a) Classification depuis FloatingPanel ou Sidebar
  const handleSearchClassify = (
    e: Entreprise,
    newType: EntrepriseType
  ) => {
    const classified = { ...e, type: newType }
    // Met à jour la carte
    setMapData(prev =>
      prev.some(x => x.siren === e.siren)
        ? prev.map(x => (x.siren === e.siren ? classified : x))
        : [...prev, classified]
    )
    // Retire des résultats non classés
    setSearchHistory(prev => prev.filter(x => x.siren !== e.siren))
  }

  // 2b) Suppression depuis FloatingPanel ou Sidebar
  const handleSearchRemove = (e: Entreprise) => {
    setSearchHistory(prev => prev.filter(x => x.siren !== e.siren))
    setMapData(prev => prev.filter(x => x.siren !== e.siren))
  }

  // 3) Recentrage manuel depuis Sidebar ou FloatingPanel
  const handleLocate = (e: Entreprise) => {
    setCenter(e.position)
  }

  // 4) Recherche par filtres (activités, effectifs, rayon)
  const handleFilterSearch = async (filters: {
    activityId: string
    employeesCategory: string
    radius: number
  }) => {
    try {
      // Met à jour le rayon pour le cercle
      setFilterRadius(filters.radius)

      const params = new URLSearchParams({
        naf: filters.activityId,
        employeesCategory: filters.employeesCategory,
        radius: filters.radius.toString(),
        lng: center[0].toString(),
        lat: center[1].toString(),
      })
      const res = await fetch(
        `https://application-map.onrender.com/api/search-filters?${params}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows: Entreprise[] = await res.json()
      // On met à jour l'historique et la carte
      setSearchHistory(rows)
      setMapData(rows)
      console.log('Recherche par filtres réussie', rows)
    } catch (err) {
      console.error('Recherche par filtres échouée :', err)
    }
  }

  return (
    <div className="app">
      {/* Sidebar : recherche, filtres et liste */}
      <Sidebar
        data={searchHistory}
        onSelectEntreprise={handleSelectEntreprise}
        onClassify={handleSearchClassify}
        onLocate={handleLocate}
        onRemove={handleSearchRemove}
        radius={filterRadius}
        onRadiusChange={setFilterRadius}
        onFilterSearch={handleFilterSearch}
      />


      <div className="main">
        <Map
          data={mapData}
          center={center}
          filterRadius={filterRadius}
          onClickSetCenter={(lat, lng) => setCenter([lng, lat])}
        />

        <FloatingPanel
          data={searchHistory}
          onClassify={handleSearchClassify}
          onLocate={handleLocate}
          onRemove={handleSearchRemove}
        />
      </div>
    </div>
  )
}

export default App
