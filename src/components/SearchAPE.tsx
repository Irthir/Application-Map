import { useState } from "react";

interface SearchAPEProps {
  onResults: (data: any) => void;
}

const SearchAPE = ({ onResults }: SearchAPEProps) => {
  const [input, setInput] = useState("");

  const handleSearch = async () => {
    if (!input) return;

    if (/^\d{9}$/.test(input)) {
      try {
        const response = await fetch(`https://application-map.onrender.com/api/insee/${input}`);
        const data = await response.json();
        console.log("Données SIREN :", data);

        const uniteLegale = data.uniteLegale;
        if (!uniteLegale || !Array.isArray(uniteLegale.periodesUniteLegale)) {
          alert("Informations indisponibles pour ce SIREN.");
          return;
        }

        const activePeriod = uniteLegale.periodesUniteLegale.find(
          (p: any) => p.dateFin === null
        );

        const nom =
          activePeriod?.denominationUniteLegale ||
          activePeriod?.nomUniteLegale ||
          "Entreprise";

        // Fallback géocodage par nom via OpenStreetMap
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nom)}`
        );
        const geoData = await geoRes.json();

        if (geoData.length > 0) {
          const loc = geoData[0];
          onResults([
            {
              Nom: nom,
              Latitude: parseFloat(loc.lat),
              Longitude: parseFloat(loc.lon),
              Type: "Recherche",
            },
          ]);
        } else {
          alert("Localisation introuvable pour cette entreprise.");
        }
      } catch (err) {
        console.error("Erreur SIREN :", err);
        alert("Erreur lors de la recherche par SIREN.");
      }
    } else {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}`
        );
        const geoData = await geoRes.json();

        if (geoData.length > 0) {
          const firstResult = geoData[0];
          onResults([
            {
              Nom: input,
              Latitude: parseFloat(firstResult.lat),
              Longitude: parseFloat(firstResult.lon),
              Type: "Recherche",
            },
          ]);
        } else {
          alert("Adresse ou nom d’entreprise non trouvée.");
        }
      } catch (error) {
        console.error("Erreur géocodage :", error);
        alert("Erreur lors du géocodage.");
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Nom, adresse ou SIREN"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full px-3 py-2 border rounded text-black"
      />
      <button
        onClick={handleSearch}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Rechercher
      </button>
    </div>
  );
};

export default SearchAPE;
