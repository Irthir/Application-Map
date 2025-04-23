import { useState } from "react";

interface SearchAPEProps {
  onResults: (data: any) => void;
}

const SearchAPE = ({ onResults }: SearchAPEProps) => {
  const [input, setInput] = useState("");

  const handleSearch = async () => {
    if (!input) return;

    // Cas 1 : Recherche par SIREN
    if (/^\d{9}$/.test(input)) {
      try {
        const response = await fetch(`https://application-map.onrender.com/api/insee/${input}`);
        const data = await response.json();
        console.log("Données SIREN :", data);

        if (data && data.denomination) {
          let lat = data.adresse?.coordonnees?.latitude ?? data.adresse?.coordonnees?.lat ?? 0;
          let lon = data.adresse?.coordonnees?.longitude ?? data.adresse?.coordonnees?.lon ?? 0;

          // Fallback géocodage si les coordonnées sont nulles ou à zéro
          if ((!lat || !lon) && data.adresse?.libelle) {
            const adresseStr = data.adresse.libelle;
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresseStr)}`);
            const geoData = await geoRes.json();

            if (geoData.length > 0) {
              const result = geoData[0];
              lat = parseFloat(result.lat);
              lon = parseFloat(result.lon);
            }
          }

          onResults([
            {
              Nom: data.denomination,
              Latitude: lat,
              Longitude: lon,
              Type: "Recherche",
            },
          ]);
        } else {
          alert("Entreprise non trouvée.");
        }
      } catch (error) {
        console.error("Erreur lors de la recherche SIREN :", error);
        alert("Une erreur est survenue lors de la recherche par SIREN.");
      }
    } else {
      // Cas 2 : Recherche par nom ou adresse (géocodage direct)
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
        alert("Une erreur est survenue lors du géocodage.");
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
