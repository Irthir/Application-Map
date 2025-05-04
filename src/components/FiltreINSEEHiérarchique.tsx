import React, { useEffect, useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json";
import toast from "react-hot-toast";

interface NafCode {
  id: string;
  label: string;
}

interface Props {
  center: [number, number];
  onSearchResults: (data: any[]) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const FiltreINSEEHierarchique: React.FC<Props> = ({
  center,
  onSearchResults,
  radius,
  onRadiusChange,
}) => {
  const [nafList, setNafList] = useState<NafCode[]>([]);
  const [selectedNaf, setSelectedNaf] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const baseUrl = "https://application-map.onrender.com";

  useEffect(() => {
    // Ne garder que les codes NAF détaillés (avec un point)
    const detailedCodes = nafCodes.filter(code => code.id.includes("."));
    setNafList(detailedCodes);
  }, []);

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Veuillez sélectionner un secteur !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading("🔍 Recherche BigQuery en cours...", { id: "search-loading" });

    try {
      const url = `${baseUrl}/api/bigquery-activite?naf=${encodeURIComponent(selectedNaf)}&lat=${lat}&lng=${lng}&radius=${radius}`;
      const res = await fetch(url);

      // Ancienne version INSEE — désactivée
      // const url = `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(selectedNaf)}&lat=${lat}&lng=${lng}&radius=${radius}&onlyActive=true&onlyCompanies=true`;

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        onSearchResults(data);
        toast.success(`✅ ${data.length} entreprise(s) trouvée(s) !`, { id: "search-loading" });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }
    } catch (error) {
      console.error("Erreur recherche BigQuery :", error);
      toast.error("❗ Erreur lors de la récupération des données.", { id: "search-loading" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">🏭 Filtrer par industrie (code NAF)</h3>

      <select
        value={selectedNaf}
        onChange={(e) => setSelectedNaf(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      >
        <option value="">Sélectionner un secteur</option>
        {nafList.map((naf) => (
          <option key={naf.id} value={naf.id}>
            {naf.id} - {naf.label}
          </option>
        ))}
      </select>

      <label className="block mb-2 text-sm font-medium text-gray-700">
        Rayon de recherche : {radius} km
      </label>

      <input
        type="range"
        min="1"
        max="50"
        value={radius}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        className="w-full mb-4"
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

export default FiltreINSEEHierarchique;
