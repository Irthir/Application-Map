import { useState } from "react";
import toast from 'react-hot-toast';
import { fetchCompanyBySIREN, geocodeCompany } from "../services/apiUtils";

interface SearchAPEProps {
  onResults: (data: any) => void;
}

const SearchAPE = ({ onResults }: SearchAPEProps) => {
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!input) return;

    setSearchResults([]);
    setLoading(true);

    if (/^\d{9}$/.test(input.replace(/\s+/g, ""))) {
      // Recherche par SIREN
      try {
        const companyData = await fetchCompanyBySIREN(input.replace(/\s+/g, ""));
        console.log("Données SIREN :", companyData);

        const uniteLegale = companyData?.uniteLegale;
        const activePeriod = uniteLegale?.periodesUniteLegale?.find((p: any) => p.dateFin === null);

        if (!uniteLegale || !activePeriod) {
          toast.error("Informations indisponibles pour ce SIREN.");
          return;
        }

        const nom = activePeriod?.denominationUniteLegale || activePeriod?.nomUniteLegale || "Entreprise";
        const naf = activePeriod?.activitePrincipaleUniteLegale || "";

        const geoData = await geocodeCompany(nom);

        if (geoData) {
          onResults([
            {
              Nom: nom,
              Latitude: geoData.lat,
              Longitude: geoData.lon,
              Type: "Recherche",
              Secteur: naf, // 🔥 on passe le code NAF récupéré ici
            },
          ]);
          setInput(nom);
        } else {
          toast.error("Localisation introuvable pour cette entreprise.");
        }
      } catch (err) {
        console.error("Erreur SIREN :", err);
        toast.error("Erreur lors de la recherche par SIREN.");
      } finally {
        setLoading(false);
      }
    } else {
      // Recherche par nom ou adresse
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&q=${encodeURIComponent(input)}`
        );
        const geoData = await geoRes.json();

        if (geoData.length > 0) {
          setSearchResults(geoData.slice(0, 10));
        } else {
          toast.error("Adresse ou nom d’entreprise non trouvée.");
        }
      } catch (error) {
        console.error("Erreur géocodage :", error);
        toast.error("Erreur lors du géocodage.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectResult = (result: any) => {
    setSearchResults([]);
    onResults([
      {
        Nom: result.display_name,
        Latitude: parseFloat(result.lat),
        Longitude: parseFloat(result.lon),
        Type: "Recherche",
      },
    ]);
    setInput(result.display_name);
  };

  const handleClearResults = () => {
    setSearchResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-2 relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Nom, adresse ou SIREN"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <button
        onClick={handleSearch}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        disabled={loading}
      >
        Rechercher
      </button>

      {searchResults.length > 0 && (
        <div className="absolute z-10 bg-white border border-gray-300 w-full max-h-60 overflow-y-auto rounded-lg shadow-lg mt-1">
          <div className="flex justify-between items-center p-2 border-b">
            <span className="text-sm font-semibold">Résultats</span>
            <button
              onClick={handleClearResults}
              className="text-gray-500 hover:text-red-500 text-lg font-bold leading-none"
            >
              &times;
            </button>
          </div>
          <ul>
            {searchResults.map((result, idx) => (
              <li
                key={idx}
                onClick={() => handleSelectResult(result)}
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchAPE;
