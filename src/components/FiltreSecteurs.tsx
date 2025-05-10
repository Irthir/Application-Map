import React, { useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json";
import { FaSearch } from "react-icons/fa";
import toast from "react-hot-toast";
import { fetchCompaniesByNAF_BQ } from "../services/apiUtils";
import { BQCompanyData } from "../services/apiUtils";

interface Props {
  center: [number, number];
  onSearchResults: (data: BQCompanyData[]) => void;
  radius: number;
}

const FiltreSecteurs: React.FC<Props> = ({ center, onSearchResults, radius }) => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const selectedNaf = nafCodes.find((n) => n.label.toLowerCase().includes(search.toLowerCase()));
    
    if (!selectedNaf) {
      toast.error("❗ Sélectionnez un secteur d'activité !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading(`🔎 Recherche secteur en cours...`, { id: "search-loading" });

    try {
      const results = await fetchCompaniesByNAF_BQ(selectedNaf.id, lat, lng, radius);
      onSearchResults(results);

      if (results.length > 0) {
        toast.success(`✅ ${results.length} entreprise(s) trouvée(s) !`, { id: "search-loading" });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }
    } catch (error) {
      console.error("Erreur secteur :", error);
      toast.error("Erreur lors de la récupération des données.", { id: "search-loading" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2">🎯 Filtrer par secteur d'activité</h3>

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
      <button onClick={handleSearch} disabled={loading} className="btn-search">
        🔎 Lancer la recherche
      </button>
    </div>
  );
};

export default FiltreSecteurs;
