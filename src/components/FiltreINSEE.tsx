import React, { useState } from "react";
import nafCodes from "../data/naf-codes.json";

interface Props {
  center: [number, number]; // [lng, lat]
  onSearchResults: (data: any[]) => void;
}

const FiltreINSEE: React.FC<Props> = ({ center, onSearchResults }) => {
  const [selectedNaf, setSelectedNaf] = useState("");
  const [radius, setRadius] = useState(5); // en km

  const handleSearch = async () => {
    if (!selectedNaf) return;

    const [lon, lat] = center;

    // Construire l'appel API vers Entreprise.data.gouv.fr ou API entreprise INSEE
    // Par exemple avec geoapify, entreprise.data.gouv, ou un back perso (tu peux mocker ici)
    const res = await fetch(
      `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements?activite_principale=${selectedNaf}&latitude=${lat}&longitude=${lon}&distance=${radius * 1000}`
    );
    const json = await res.json();

    const result = json.etablissements
    .filter((e: any) => e.geo?.latitude && e.geo?.longitude)
    .map((e: any) => ({
        Nom: e.nom_raison_sociale || e.unite_legale?.denomination || "Entreprise",
        Latitude: parseFloat(e.geo.latitude),
        Longitude: parseFloat(e.geo.longitude),
        Type: "Recherche",
    }));

    if (result.length > 0) {
        //const first = result[0];
        onSearchResults(result);
      }      

    if (result.length === 0) {
        alert("Aucune entreprise trouvée pour ce code APE et ce rayon.");
      }

    onSearchResults(result);
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
