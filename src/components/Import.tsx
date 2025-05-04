import React, { useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";

interface CSVRow {
  Nom: string;
  Latitude: string;
  Longitude: string;
  Type?: string;
  Adresse?: string;
  Secteur?: string;
  CodeNAF?: string;
}

const EXPECTED_FIELDS: (keyof CSVRow)[] = ["Nom", "Latitude", "Longitude"];

const ImportCSV = ({ onUpload }: { onUpload: (data: CSVRow[]) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const parsed = results.data;

        if (!Array.isArray(parsed) || parsed.length === 0) {
          toast.error("❗ Fichier vide ou mal formaté.");
          return;
        }

        const first = parsed[0];
        const missingFields = EXPECTED_FIELDS.filter((key) => !(key in first));
        if (missingFields.length > 0) {
          toast.error(`❗ Colonnes manquantes : ${missingFields.join(", ")}`);
          return;
        }

        onUpload(parsed);
      },
      error: (err) => {
        console.error("Erreur CSV:", err);
        toast.error("❗ Erreur lors du traitement du fichier CSV.");
      },
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <button
        onClick={handleButtonClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow"
        aria-label="Importer un fichier CSV"
      >
        📂 Importer les données
      </button>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default ImportCSV;
