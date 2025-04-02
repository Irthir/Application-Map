//import React, { useState } from "react";
import Papa from "papaparse";

const ImportCSV = ({ onUpload }: { onUpload: (data: any[]) => void }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => onUpload(results.data),
    });
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileChange} />
    </div>
  );
};

export default ImportCSV;
