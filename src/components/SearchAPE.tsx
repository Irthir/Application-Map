import { useState } from "react";

interface SearchAPEProps {
  onResults: (data: any) => void;
}

const SearchAPE = ({ onResults }: SearchAPEProps) => {
  const [input, setInput] = useState("");

  const handleSearch = async () => {
    if (!input) return;

    if (/^\d{9}$/.test(input)) {
      const response = await fetch(`http://localhost:5000/api/insee/${input}`);
      const data = await response.json();

      if (data && data.denomination) {
        onResults({
          denomination: data.denomination,
          adresse: data.adresse,
          siren: input,
        });
      } else {
        alert("Entreprise non trouvée.");
      }
    } else {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}`
        );
        const geoData = await geoRes.json();

        if (geoData.length > 0) {
          const firstResult = geoData[0];
          onResults({
            denomination: input,
            latitude: firstResult.lat,
            longitude: firstResult.lon,
            siren: null,
          });
        } else {
          alert("Adresse ou nom d’entreprise non trouvée.");
        }
      } catch (error) {
        console.error("Erreur géocodage :", error);
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
