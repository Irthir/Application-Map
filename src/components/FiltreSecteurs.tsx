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
  const [selectedNaf, setSelectedNaf] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtrage des secteurs
  const filteredNaf = nafCodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  // Fonction de sélection d'un secteur
  const handleNafSelection = (id: string) => {
    setSelectedNaf(id);
  };

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Sélectionnez un secteur d'activité !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading(`🔎 Recherche secteur en cours...`, { id: "search-loading" });

    try {
      const nafObj = nafCodes.find((n) => n.id === selectedNaf);
      if (!nafObj) throw new Error("Code NAF non trouvé dans la base.");

      const results = await fetchCompaniesByNAF_BQ(nafObj.id, lat, lng, radius);

      // Filtrer les résultats pour enlever les entreprises avec 'undefined' ou 'Non spécifié'
      const cleanResults = results.filter((r: BQCompanyData) => {
        // Vérifier que Secteur est une chaîne de caractères valide
        const secteur = typeof r.Secteur === 'string' && r.Secteur !== "Non spécifié" ? r.Secteur : null;
        return (
          r.Nom && r.Nom !== "undefined" && 
          secteur &&  // Vérifier que Secteur existe et est valide
          r.Latitude !== undefined && r.Longitude !== undefined
        );
      });

      onSearchResults(cleanResults);

      if (cleanResults.length > 0) {
        toast.success(`✅ ${cleanResults.length} entreprise(s) trouvée(s) !`, { id: "search-loading" });
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

      {/* Liste déroulante des secteurs */}
      {filteredNaf.length > 0 && (
        <select
          className="w-full border rounded p-2 mt-2"
          onChange={(e) => handleNafSelection(e.target.value)}
          value={selectedNaf || ""}
        >
          <option value="" disabled>Sélectionnez un secteur</option>
          {filteredNaf.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.label}
            </option>
          ))}
        </select>
      )}

      <button onClick={handleSearch} disabled={loading} className="btn-search mt-4">
        🔎 Lancer la recherche
      </button>
    </div>
  );
};

export default FiltreSecteurs;
