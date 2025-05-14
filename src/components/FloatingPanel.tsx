import React from "react";
import { DataPoint } from "../type";
import { FaChevronRight } from "react-icons/fa";

interface FloatingPanelProps {
  data: DataPoint[];
  onCenter: (lat: number, lon: number) => void;
  filterRadius: number;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  data,
  onCenter,
  filterRadius,
}) => {
  // On ne garde que les points dans le rayon courant
  // …
  const visiblePoints = data.filter((d) => {
    if (d.Distance == null) return true;
    const distNum = Number(d.Distance);
    return !isNaN(distNum) && distNum <= filterRadius;
  });
  // …


  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-lg w-80">
      {/* En-tête */}
      <div className="px-6 pt-6 pb-4 border-b">
        <h3 className="text-xl font-bold text-gray-800">List of prospects</h3>
      </div>

      {/* Contenu */}
      <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
        {visiblePoints.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer"
            onClick={() => onCenter(item.Latitude, item.Longitude)}
          >
            <div className="space-y-1">
              <div className="font-medium text-gray-800">{item.Nom}</div>
              <div className="text-sm text-gray-500">{item.Adresse}</div>
            </div>
            <div className="text-sm text-gray-600 mr-4">
              {item.Secteur}
            </div>
            <FaChevronRight className="text-gray-400" />
          </li>
        ))}

        {visiblePoints.length === 0 && (
          <li className="px-6 py-4 text-sm text-gray-500">
            Aucun prospect dans ce rayon ({filterRadius} km).
          </li>
        )}
      </ul>
    </div>
  );
};

export default FloatingPanel;
