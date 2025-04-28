import React, { useEffect, useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json"; // ✅ version enrichie
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
    // Optionnel : on peut filtrer uniquement les niveaux détaillés (ex: 01.13Z et pas 01)
    const detailedCodes = nafCodes.filter((code) => code.id.includes("."));
    setNafList(detailedCodes);
  }, []);

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Veuillez sélectionner un secteur !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading("🔎 Recherche en cours...", { id: "search-loading" });

    try {
      const url = `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(selectedNaf)}&lat=${lat}&lng=${lng}&radius=${radius}&onlyActive=true&onlyCompanies=true`;
      const res = await fetch(url);

      if (!res.ok) throw new Error("Erreur serveur INSEE");

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        onSearchResults(data);
        toast.success(`✅ ${data.length} entreprise(s) trouvée(s) !`, { id: "search-loading" });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }
    } catch (error) {
      console.error("Erreur INSEE :", error);
      toast.error("Erreur lors de la récupération des données INSEE.", { id: "search-loading" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">🏭 Filtrer par industrie (NAF)</h3>

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
