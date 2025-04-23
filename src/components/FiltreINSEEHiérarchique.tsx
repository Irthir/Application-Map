import React, { useEffect, useState } from "react";
import nafCodes from "../data/naf-codes.json";

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

  //const isDev = import.meta.env.DEV;
  const baseUrl = "https://application-map.onrender.com";

  useEffect(() => {
    const filtered = nafCodes.filter((code) => code.id.includes("."));
    setNafList(filtered);
  }, []);

  const handleSearch = async () => {
    if (!selectedNaf) return;
    const [lng, lat] = center;

    setLoading(true);
    console.log(`🔍 Recherche secteur ${selectedNaf} à la position: ${lat}, ${lng}`);

    try {
      const res = await fetch(
        `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(
          selectedNaf
        )}&lat=${lat}&lng=${lng}&radius=${radius}`
      );

      if (!res.ok) throw new Error("Erreur lors de la récupération des données INSEE");
      const data = await res.json();

      if (data.length === 0) {
        alert("Aucun établissement trouvé. Essayez d'élargir le rayon ou de changer de secteur.");
      }

      onSearchResults(data);
    } catch (error) {
      console.error("Erreur INSEE :", error);
      alert("Impossible de récupérer les données INSEE.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">Filtrer par industrie</h3>

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
        className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? "Recherche..." : "Rechercher"}
      </button>
    </div>
  );
};

export default FiltreINSEEHierarchique;
