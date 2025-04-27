import React, { useState } from "react";
import nafCodes from "../data/naf-codes.json";
import { FaChevronDown, FaChevronUp, FaSearch } from "react-icons/fa";
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
  const [selectedNafs, setSelectedNafs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredNaf = nafCodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  const baseUrl = "https://application-map.onrender.com";

  const toggleNaf = (id: string) => {
    setSelectedNafs((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    if (selectedNafs.length === 0) {
      toast.error("❗ Sélectionnez au moins un secteur d'activité !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading("🔎 Recherche en cours...", { id: "search-loading" });

    try {
      const allResults: any[] = [];

      for (const naf of selectedNafs) {
        const res = await fetch(
          `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(naf)}&lat=${lat}&lng=${lng}&radius=${radius}`
        );

        if (res.ok) {
          const data = await res.json();
          allResults.push(...data);
        } else {
          console.error(`Erreur pour le NAF ${naf}`);
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
          {filteredNaf.map((n) => (
            <label
              key={n.id}
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                value={n.id}
                checked={selectedNafs.includes(n.id)}
                onChange={() => toggleNaf(n.id)}
              />
              {n.label}
            </label>
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
