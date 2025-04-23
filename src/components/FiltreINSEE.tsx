import React, { useState } from "react";
import nafCodes from "../data/naf-codes.json";

interface Props {
  center: [number, number]; // [lng, lat]
  onSearchResults: (data: any[]) => void;
}

const FiltreINSEE: React.FC<Props> = ({ center, onSearchResults }) => {
  const [selectedNaf, setSelectedNaf] = useState("");
  const [radius, setRadius] = useState(5); // en km

  const isDev = import.meta.env.DEV;
  const baseUrl = "https://application-map.onrender.com";

  const handleSearch = async () => {
    if (!selectedNaf) return;

    const [lon, lat] = center;

    try {
      const res = await fetch(
        `${baseUrl}/api/insee-activite?naf=${encodeURIComponent(
          selectedNaf
        )}&lat=${lat}&lng=${lon}&radius=${radius}`
      );

      if (!res.ok) throw new Error("Erreur lors de la récupération des données INSEE");

      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("Données INSEE inattendues", data);
        return;
      }      
      const result = data.map((e: any) => ({
        Nom: e.Nom,
        Latitude: e.latitude ?? e.lat ?? 0,
        Longitude: e.longitude ?? e.lon ?? 0,
        Type: "Recherche",
      }));

      if (result.length === 0) {
        alert("Aucune entreprise trouvée pour ce code APE et ce rayon.");
      }

      onSearchResults(result);
    } catch (error) {
      console.error("Erreur INSEE :", error);
      alert("Erreur lors de la récupération des données INSEE.");
    }
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">Filtrer par activité INSEE</h3>
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
        className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
      >
        Rechercher
      </button>
    </div>
  );
};

export default FiltreINSEE;
