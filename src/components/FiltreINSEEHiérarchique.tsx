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

const FiltreINSEEHierarchique: React.FC<Props> = ({ center, onSearchResults, radius, onRadiusChange }) => {
  const [nafList, setNafList] = useState<NafCode[]>([]);
  const [selectedNaf, setSelectedNaf] = useState<string>("");

  useEffect(() => {
    const filtered = nafCodes.filter((code) => code.id.includes("."));
    setNafList(filtered);
  }, []);

  const handleSearch = async () => {
    if (!selectedNaf) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/insee-activite?naf=${selectedNaf}`
      );

      if (!res.ok) throw new Error("Erreur lors de la récupération des données INSEE");

      const data = await res.json();

      const [lng, lat] = center;

      const results = data
        .map((item: any) => {
          const distance = haversineDistance(lat, lng, item.Latitude, item.Longitude);
          return { ...item, distance };
        })
        .filter((item: any) => item.distance <= radius);

      onSearchResults(results);
    } catch (error) {
      console.error("Erreur INSEE :", error);
      alert("Impossible de récupérer les données INSEE.");
    }
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">Filtrer par activité (NAF)</h3>

      <select
        value={selectedNaf}
        onChange={(e) => setSelectedNaf(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      >
        <option value="">Sélectionner un secteur</option>
        {nafList.map((c) => (
          <option key={c.id} value={c.id.replace(".", "")}>
            {c.id} - {c.label}
          </option>
        ))}
      </select>

      <label className="block mb-2 text-sm font-medium text-gray-700">
        Rayon de recherche : {radius ?? 0} km
      </label>
      <input
        type="range"
        min="1"
        max="50"
        value={radius ?? 0}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        className="w-full mb-4"
      />

      <button
        onClick={handleSearch}
        className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
      >
        Rechercher
      </button>
    </div>
  );
};

export default FiltreINSEEHierarchique;
