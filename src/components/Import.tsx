import React, { useRef } from "react";
import Papa from "papaparse";

const ImportCSV = ({ onUpload }: { onUpload: (data: any[]) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => onUpload(results.data),
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {/* Bouton stylisé */}
      <button
        onClick={handleButtonClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow"
      >
        Importer les données
      </button>

      {/* Input caché */}
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
