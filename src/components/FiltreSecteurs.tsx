import React, { useState, useEffect } from "react";
import nafCodes from "../data/naf-codes.json";
import { FaChevronDown, FaChevronUp, FaStar, FaRegStar, FaSearch } from "react-icons/fa";
import toast from 'react-hot-toast';

interface Props {
  center: [number, number];
  onSearchResults: (data: any[]) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const FiltreSecteurs: React.FC<Props> = ({ center, onSearchResults, radius, onRadiusChange }) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedNaf, setSelectedNaf] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("favNaf");
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const toggleFavorite = (id: string) => {
    let updated: string[];
    if (favorites.includes(id)) {
      updated = favorites.filter(fav => fav !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem("favNaf", JSON.stringify(updated));
  };

  const filteredNaf = nafCodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  const baseUrl = "https://application-map.onrender.com";//"http://localhost:5000"; // Peut aussi être mis dynamiquement selon l'environnement

  const handleSearch = async () => {
    if (!selectedNaf) return;
    const [lng, lat] = center;

    setLoading(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(selectedNaf)}&lat=${lat}&lng=${lng}&radius=${radius}`
      );

      if (!res.ok) {
        throw new Error("Erreur lors de la récupération des données INSEE");
      }

      const data = await res.json();
      onSearchResults(data);
      toast.success(`✅ ${data.length} entreprise(s) trouvée(s) !`);
    } catch (error) {
      console.error("Erreur INSEE:", error);
      //alert("Erreur lors de la récupération des données INSEE.");
      toast.error("Erreur lors de la récupération des données INSEE.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">Filtrer par secteur d'activité</h3>

      <div className="relative mb-2">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un secteur"
          className="pl-10 w-full border rounded p-2"
        />
      </div>

      <div className="flex justify-between items-center mb-2">
        <label className="font-medium">Rayon : {radius} km</label>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="text-blue-600"
        >
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {expanded && (
        <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
          {favorites.length > 0 && (
            <>
              <div className="text-sm text-gray-600 font-bold mb-1">Favoris :</div>
              {favorites.map((id) => {
                const naf = nafCodes.find((n) => n.id === id);
                return naf ? (
                  <div
                    key={naf.id}
                    className={`flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer ${
                      selectedNaf === naf.id ? "bg-blue-100" : ""
                    }`}
                    onClick={() => setSelectedNaf(naf.id)}
                  >
                    <FaStar className="text-yellow-400" />
                    {naf.label}
                  </div>
                ) : null;
              })}
              <hr className="my-2" />
            </>
          )}

          {filteredNaf.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer ${
                selectedNaf === n.id ? "bg-blue-100" : ""
              }`}
              onClick={() => setSelectedNaf(n.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(n.id);
                }}
              >
                {favorites.includes(n.id) ? (
                  <FaStar className="text-yellow-400" />
                ) : (
                  <FaRegStar className="text-gray-400" />
                )}
              </button>
              {n.label}
            </div>
          ))}
        </div>
      )}

      <input
        type="range"
        min="1"
        max="50"
        value={radius}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        className="w-full mt-2"
      />

      <button
        onClick={handleSearch}
        disabled={loading}
        className="mt-2 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
      >
        {loading ? "Recherche en cours..." : "Rechercher"}
      </button>
    </div>
  );
};

export default FiltreSecteurs;
