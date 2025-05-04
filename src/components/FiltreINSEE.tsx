import React, { useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json";
import toast from "react-hot-toast";

interface Props {
  center: [number, number];
  onSearchResults: (data: any[]) => void;
}

const FiltreINSEE: React.FC<Props> = ({ center, onSearchResults }) => {
  const [selectedNaf, setSelectedNaf] = useState("");
  const [radius, setRadius] = useState(5);
  const [loading, setLoading] = useState(false);

  const baseUrl = "https://application-map.onrender.com";

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Veuillez sélectionner un secteur !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading("🔍 Recherche BigQuery en cours...", { id: "search-loading" });

    try {
      const url = `${baseUrl}/api/bigquery-activite?naf=${encodeURIComponent(
        selectedNaf
      )}&lat=${lat}&lng=${lng}&radius=${radius}`;

      // 💤 Ancienne API INSEE
      // const url = `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(selectedNaf)}&lat=${lat}&lng=${lng}&radius=${radius}&onlyActive=true&onlyCompanies=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        onSearchResults(data);
        toast.success(`✅ ${data.length} entreprise(s) trouvée(s) !`, {
          id: "search-loading",
        });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }
    } catch (error) {
      console.error("Erreur BigQuery :", error);
      toast.error("❗ Erreur lors de la récupération des données.", {
        id: "search-loading",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">🔎 Filtrer par activité (code NAF)</h3>

      <select
        value={selectedNaf}
        onChange={(e) => setSelectedNaf(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      >
        <option value="">Sélectionner une activité</option>
        {nafCodes.map((naf) => (
          <option key={naf.id} value={naf.id}>
            {naf.id} - {naf.label}
          </option>
        ))}
      </select>

      <input
        type="number"
        min="1"
        max="50"
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))}
        className="w-full border rounded p-2 mb-2"
        placeholder="Rayon (km)"
      />

      <button
        onClick={handleSearch}
        disabled={loading}
        className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "🔍 Recherche..." : "🔎 Rechercher"}
      </button>
    </div>
  );
};

export default FiltreINSEE;
