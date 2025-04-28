import React, { useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json"; // ✅ version enrichie
import { FaChevronDown, FaChevronUp, FaSearch, FaBroom } from "react-icons/fa";
import toast from "react-hot-toast";

interface Props {
  center: [number, number];
  onSearchResults: (data: any[]) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const FiltreSecteurs: React.FC<Props> = ({ center, onSearchResults, radius, onRadiusChange }) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedNaf, setSelectedNaf] = useState<string | null>(null);
  const [onlyActive, setOnlyActive] = useState(true);
  const [onlyCompanies, setOnlyCompanies] = useState(true);
  const [loading, setLoading] = useState(false);

  const baseUrl = "https://application-map.onrender.com";

  const filteredNaf = nafCodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleNafSelection = (id: string) => {
    if (selectedNaf === id) {
      setSelectedNaf(null); // décocher
    } else {
      setSelectedNaf(id); // forcer 1 seul sélectionné
    }
  };

  const clearSelection = () => {
    setSelectedNaf(null);
    toast.success("✅ Sélection vidée !");
  };

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Sélectionnez un secteur d'activité !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading("🔎 Recherche en cours...", { id: "search-loading" });

    try {
      const nafObj = nafCodes.find(n => n.id === selectedNaf);
      if (!nafObj) throw new Error("Code NAF non trouvé dans la base enrichie.");

      const allNafs = new Set<string>([nafObj.id]);
      if (nafObj.related) {
        nafObj.related.forEach(rel => allNafs.add(rel));
      }

      const allResults: any[] = [];

      for (const naf of allNafs) {
        const url = `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(naf)}&lat=${lat}&lng=${lng}&radius=${radius}&onlyActive=${onlyActive}&onlyCompanies=${onlyCompanies}`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();
          allResults.push(...data);
        } else {
          console.error(`Erreur API pour le NAF ${naf}`);
        }
      }

      onSearchResults(allResults);

      if (allResults.length > 0) {
        toast.success(`✅ ${allResults.length} entreprise(s) trouvée(s) !`, { id: "search-loading" });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }
    } catch (error) {
      console.error("Erreur INSEE:", error);
      toast.error("Erreur lors de la récupération des données INSEE.", { id: "search-loading" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2">🎯 Filtrer par secteur d'activité</h3>

      {/* Barre de recherche */}
      <div className="relative mb-2">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Rechercher un secteur"
          className="pl-10 w-full border rounded p-2"
        />
      </div>

      {/* Paramètres */}
      <div className="flex justify-between items-center mb-2">
        <label className="font-medium">Rayon : {radius} km</label>
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="text-blue-600"
        >
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {/* Liste des secteurs */}
      {expanded && (
        <div className="max-h-64 overflow-y-auto border rounded p-2 grid grid-cols-3 gap-2">
          {filteredNaf.map((n) => (
            <label
              key={n.id}
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer text-sm"
            >
              <input
                type="radio"
                name="naf-selection"
                value={n.id}
                checked={selectedNaf === n.id}
                onChange={() => handleNafSelection(n.id)}
              />
              {n.label}
            </label>
          ))}
        </div>
      )}

      {/* Filtres supplémentaires */}
      <div className="flex flex-col gap-2 mt-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={() => setOnlyActive(prev => !prev)}
          />
          Entreprises actives uniquement
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyCompanies}
            onChange={() => setOnlyCompanies(prev => !prev)}
          />
          Seulement sociétés (cat. juridique ≥ 2000)
        </label>
      </div>

      {/* Slider de rayon */}
      <input
        type="range"
        min="1"
        max="50"
        value={radius}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        className="w-full mt-4"
      />

      {/* Boutons actions */}
      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 disabled:opacity-50"
        >
          {loading ? "🔍 Recherche en cours..." : "🔎 Lancer la recherche"}
        </button>

        <button
          onClick={clearSelection}
          className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm"
        >
          <FaBroom className="mr-2" /> Vider la sélection
        </button>
      </div>
    </div>
  );
};

export default FiltreSecteurs;
