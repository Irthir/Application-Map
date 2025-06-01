// src/App.tsx
import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Map from './components/Map'
import FloatingPanel from './components/FloatingPanel'
import { Entreprise, EntrepriseType } from './type'
import './index.css'

const ENTREPRISES_CACHE_KEY = "entreprises_cache";

const App: React.FC = () => {
  // Tous les marqueurs sur la carte
  const [mapData, setMapData] = useState<Entreprise[]>([])
  // Résultats de recherche non classés (en attente de classification)
  const [searchHistory, setSearchHistory] = useState<Entreprise[]>([])
  // Données classifiées (clients et prospects)
  const [userData, setUserData] = useState<Entreprise[]>([])
  // Centre de la carte
  const [center, setCenter] = useState<[number, number]>([2.3522, 48.8566])
  // Rayon de filtre utilisé pour dessiner le cercle sur la carte
  const [filterRadius, setFilterRadius] = useState<number>(20)

  // 1. CHARGER LE CACHE AU DEMARRAGE
  useEffect(() => {
    const cached = localStorage.getItem(ENTREPRISES_CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setUserData(parsed)
        // On peut aussi les afficher sur la carte au lancement
        setMapData(prev => {
          // Optionnel : éviter de doubler si mapData déjà alimenté
          const ids = new Set(parsed.map((e: Entreprise) => e.siren))
          return [...prev.filter(e => !ids.has(e.siren)), ...parsed]
        })
      } catch (e) {
        setUserData([])
      }
    }
  }, [])

  // 2. SAUVEGARDE AUTO À CHAQUE CHANGEMENT userData
  useEffect(() => {
    localStorage.setItem(ENTREPRISES_CACHE_KEY, JSON.stringify(userData))
  }, [userData])

  /** Import depuis fichier JSON */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string)
        if (Array.isArray(imported)) {
          setUserData(imported)
          localStorage.setItem(ENTREPRISES_CACHE_KEY, JSON.stringify(imported))
          // Optionnel : afficher directement sur la carte
          setMapData(prev => {
            const ids = new Set(imported.map((e: Entreprise) => e.siren))
            return [...prev.filter(e => !ids.has(e.siren)), ...imported]
          })
        } else {
          alert("Le fichier doit contenir un tableau JSON d'entreprises.")
        }
      } catch (err) {
        alert("Erreur lors de la lecture du fichier d'import.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  /** Sélection depuis la recherche textuelle */
  const handleSelectEntreprise = (e: Entreprise) => {
    setCenter(e.position)
    setSearchHistory(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    )
    setMapData(prev =>
      prev.some(x => x.siren === e.siren) ? prev : [...prev, e]
    )
  }

  /** Classification depuis FloatingPanel (actuellement en recherche) */
  const handleSearchClassify = (
    e: Entreprise,
    newType: EntrepriseType
  ) => {
    const classified = { ...e, type: newType }
    setUserData(prev => [...prev, classified])
    setMapData(prev =>
      prev.map(x => x.siren === e.siren ? classified : x)
    )
    setSearchHistory(prev => prev.filter(x => x.siren !== e.siren))
  }

  /** Suppression depuis FloatingPanel (en recherche) */
  const handleSearchRemove = (e: Entreprise) => {
    setSearchHistory(prev => prev.filter(x => x.siren !== e.siren))
    setMapData(prev => prev.filter(x => x.siren !== e.siren))
  }

  /** Recentrage manuel depuis Sidebar ou FloatingPanel */
  const handleLocate = (e: Entreprise) => {
    setCenter(e.position)
  }

  /** Classification depuis Sidebar (clients/prospects) */
  const handleUserClassify = (
    e: Entreprise,
    newType: EntrepriseType
  ) => {
    const updated = { ...e, type: newType }
    setUserData(prev =>
      prev.map(x => x.siren === e.siren ? updated : x)
    )
    setMapData(prev =>
      prev.map(x => x.siren === e.siren ? updated : x)
    )
  }

  /** Suppression depuis Sidebar (clients/prospects) */
  const handleUserRemove = (e: Entreprise) => {
    setUserData(prev => prev.filter(x => x.siren !== e.siren))
    setMapData(prev => prev.filter(x => x.siren !== e.siren))
  }

  /** Recherche par filtres (activités, effectifs, rayon) */
  const handleFilterSearch = async (filters: {
    activityId: string
    employeesCategory: string
    radius: number
  }) => {
    try {
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
      setSearchHistory(rows)
      setMapData(rows)
      console.log('Recherche par filtres réussie', rows)
    } catch (err) {
      console.error('Recherche par filtres échouée :', err)
    }
  }

  /** Recherche similaire (par code NAF + position + rayon) */
  const handleSearchSimilar = async (e: Entreprise) => {
    setCenter(e.position)
    await handleFilterSearch({
      activityId: e.codeNAF,
      employeesCategory: "", // vide = toutes tailles, adapte si besoin
      radius: filterRadius,
    });
  }

  return (
    <div className="app">
      {/* Sidebar : clients/prospects */}
      <Sidebar
        data={userData}
        onSelectEntreprise={handleSelectEntreprise}
        onClassify={handleUserClassify}
        onLocate={handleLocate}
        onRemove={handleUserRemove}
        onSearchSimilar={handleSearchSimilar} // AJOUT ICI !
        radius={filterRadius}
        onRadiusChange={setFilterRadius}
        onFilterSearch={handleFilterSearch}
      />

      <div className="main" style={{ position: "relative" }}>
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

        {/* BOUTON IMPORT FLOTTANT */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 32,
            zIndex: 1000,
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
            padding: "10px 20px",
          }}
        >
          <label
            style={{
              cursor: "pointer",
              color: "#3182ce",
              fontWeight: "bold"
            }}
          >
            Importer entreprises
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default App
