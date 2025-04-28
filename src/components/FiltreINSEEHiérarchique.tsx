import React, { useEffect, useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json"; // ✅ enrichi
import toast from 'react-hot-toast';

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
    const filtered = nafCodes.filter((code) => code.id.includes("."));
    setNafList(filtered);
  }, []);

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Sélectionnez un secteur d'activité !");
      return;
    }

    const [lng, lat] = center;
    setLoading(true);
    toast.loading("🔎 Recherche secteur...", { id: "search-loading" });

    try {
      const nafEntry = nafCodes.find((n) => n.id === selectedNaf);
      if (!nafEntry) {
        toast.error("❗ Code APE non trouvé.", { id: "search-loading" });
        return;
      }

      const codesToSearch = new Set<string>([nafEntry.id]);
      if (nafEntry.related) {
        nafEntry.related.forEach(r => codesToSearch.add(r));
      }

      const allResults: any[] = [];

      for (const naf of codesToSearch) {
        const res = await fetch(
          `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(naf)}&lat=${lat}&lng=${lng}&radius=${radius}`
        );
        if (res.ok) {
          const data = await res.json();
          allResults.push(...data);
        } else {
          console.error(`Erreur pour le code ${naf}`);
        }
      }

      if (allResults.length > 0) {
        toast.success(`✅ ${allResults.length} établissement(s) trouvé(s) !`, { id: "search-loading" });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }

      onSearchResults(allResults);

    } catch (error) {
      console.error("Erreur INSEE :", error);
      toast.error("❗ Erreur lors de la recherche INSEE.", { id: "search-loading" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2">🏢 Recherche Hiérarchique</h3>

      <select
        value={selectedNaf}
        onChange={(e) => setSelectedNaf(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      >
        <option value="">Sélectionner un secteur</option>
        {nafList.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id} - {c.label}
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
        className="bg-gradient-to-r from-blue-500 to-blue-700 text-white w-full py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 disabled:bg-gray-400"
      >
        {loading ? "🔄 Recherche..." : "🔎 Lancer la recherche"}
      </button>
    </div>
  );
};

export default FiltreINSEEHierarchique;
