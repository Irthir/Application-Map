import { useState } from "react";
import { fetchCompanyBySIREN } from "../services/apiUtils";

const SearchAPE = ({ onResults }: { onResults: (data: any) => void }) => {
  const [siren, setSiren] = useState("");

  const handleSearch = async () => {
    try {
      const result = await fetchCompanyBySIREN(siren);
      onResults(result); // On envoie l'unique résultat
    } catch (error) {
      console.error("Erreur lors de la recherche :", error);
      onResults(null);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="SIREN"
        value={siren}
        onChange={(e) => setSiren(e.target.value)}
      />
      <button onClick={handleSearch}>Rechercher</button>
    </div>
  );
};

export default SearchAPE;
