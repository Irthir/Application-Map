import React, { useState } from "react";
import nafCodes from "../data/naf-codes-enriched.json"; // ✅ nouvelle source enrichie
import toast from 'react-hot-toast';

interface Props {
  center: [number, number];
  onSearchResults: (data: any[]) => void;
}

const FiltreINSEE: React.FC<Props> = ({ center, onSearchResults }) => {
  const [selectedNaf, setSelectedNaf] = useState("");
  const [radius, setRadius] = useState(5);

  const baseUrl = "https://application-map.onrender.com";

  const handleSearch = async () => {
    if (!selectedNaf) {
      toast.error("❗ Veuillez choisir un secteur.");
      return;
    }

    const [lon, lat] = center;
    toast.loading("🔎 Recherche...", { id: "search-loading" });

    try {
      const nafEntry = nafCodes.find((n) => n.id === selectedNaf);
      if (!nafEntry) {
        toast.error("❗ Code APE non trouvé.");
        return;
      }

      const codesToSearch = new Set<string>([nafEntry.id]);
      if (nafEntry.related) {
        nafEntry.related.forEach(r => codesToSearch.add(r));
      }

      const allResults: any[] = [];

      for (const naf of codesToSearch) {
        const res = await fetch(
          `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(naf)}&lat=${lat}&lng=${lon}&radius=${radius}`
        );
        if (res.ok) {
          const data = await res.json();
          allResults.push(...data);
        } else {
          console.error(`Erreur pour le code ${naf}`);
        }
      }

      if (allResults.length > 0) {
        toast.success(`✅ ${allResults.length} entreprise(s) trouvée(s) !`, { id: "search-loading" });
      } else {
        toast.error("❗ Aucun établissement trouvé.", { id: "search-loading" });
      }

      onSearchResults(allResults);

    } catch (error) {
      console.error("Erreur INSEE :", error);
      toast.error("❗ Erreur lors de la récupération des données INSEE.", { id: "search-loading" });
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2">🔎 Recherche par Code APE</h3>

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
        className="bg-gradient-to-r from-blue-500 to-blue-700 text-white w-full py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800"
      >
        Lancer la recherche
      </button>
    </div>
  );
};

export default FiltreINSEE;
