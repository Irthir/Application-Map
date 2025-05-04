import { useState } from "react";

interface FilterProps {
  onFilter: (radius: number) => void;
}

const Filter = ({ onFilter }: FilterProps) => {
  const [radius, setRadius] = useState(10);

  const handleFilter = () => {
    if (radius < 1 || radius > 50) return;
    onFilter(radius);
  };

  return (
    <div className="mb-4 p-4 border rounded shadow-sm bg-white">
      <h3 className="font-semibold mb-2">🧭 Filtrer par distance</h3>

      <label className="block mb-1 text-sm text-gray-700">
        Rayon : {radius} km
      </label>

      <input
        type="range"
        min="1"
        max="50"
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))}
        className="w-full mb-3"
      />

      <button
        onClick={handleFilter}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        🔎 Appliquer le filtre
      </button>
    </div>
  );
};

export default Filter;
