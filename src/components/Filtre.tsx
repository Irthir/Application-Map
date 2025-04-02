import { useState } from "react"; // Ajoute cet import

const Filter = ({ onFilter }: { onFilter: (radius: number) => void }) => {
  const [radius, setRadius] = useState(10); // État pour stocker le rayon

  const handleFilter = () => {
    onFilter(radius); // Appelle la fonction passée en prop avec le rayon
  };

  return (
    <div>
      <input
        type="number"
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))} // Met à jour le rayon
        placeholder="Radius (km)"
      />
      <button onClick={handleFilter}>Filter</button>
    </div>
  );
};

export default Filter;
