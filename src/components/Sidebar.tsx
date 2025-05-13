import { useState } from "react";
import { FaChevronDown, FaChevronUp, FaTrashAlt } from "react-icons/fa";
import { DataPoint } from "../type";
import { toast } from "react-hot-toast";

interface SidebarProps {
  data: DataPoint[];
  onUpload: (data: DataPoint[]) => void;
  onSearchResults: (data: any[]) => void;
  mapCenter: [number, number];
  filterRadius: number;
  onClearRecherche: () => void;
  onClearCache: () => void;
  onSetType: (nom: string, type: "Client" | "Prospect") => void;
  onRemoveItem: (nom: string) => void;
  onCenter: (lat: number, lon: number) => void;
  onFilter: (radius: number) => void;
  onToggleVisibility: (nom: string) => void;
  hiddenMarkers: string[];
  setFilterRadius: (radius: number) => void;
  arborescence: any;
}

const Sidebar = ({
  data,
  onUpload,
  filterRadius,
  onClearRecherche,
  onClearCache,
  onSetType,
  onRemoveItem,
  onFilter,
  arborescence,
}: SidebarProps) => {
  const [globalLoading] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [expandedDivisions, setExpandedDivisions] = useState<string[]>([]);

  // Fonction pour ajuster le rayon de recherche
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = Number(e.target.value);
    onFilter(newRadius); // Mettre à jour le rayon de recherche via la fonction passée depuis App.tsx
  };

  // Fonction pour gérer l'expansion/fermeture des divisions
  const toggleDivision = (division: string) => {
    setExpandedDivisions((prev) =>
      prev.includes(division) ? prev.filter((d) => d !== division) : [...prev, division]
    );
  };

  // Fonction pour gérer la sélection/désélection des divisions
  const toggleDivisionSelection = (division: string) => {
    setSelectedDivisions((prev) =>
      prev.includes(division) ? prev.filter((d) => d !== division) : [...prev, division]
    );
  };

  // Fonction pour gérer la sélection/désélection des activités
  const toggleActivitySelection = (activity: string) => {
    setSelectedDivisions((prev) =>
      prev.includes(activity) ? prev.filter((d) => d !== activity) : [...prev, activity]
    );
  };

  const clearAllData = () => {
    if (confirm("Voulez-vous vraiment tout supprimer ?")) {
      onUpload([]); // Effacer toutes les données
      toast.success("🗑️ Données effacées !");
    }
  };

  return (
    <aside className="sidebar p-4 space-y-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Application Map</h1>

      {globalLoading && (
        <div className="bg-blue-100 text-blue-700 p-2 text-center text-sm rounded animate-pulse">
          🔄 Recherche en cours...
        </div>
      )}

      {/* Recherche section */}
      <section className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">🔎 Recherche</h2>
        {/* Ajoutez ici votre composant de recherche */}
      </section>

      {/* Rayon de recherche */}
      <section className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">🎯 Rayon de recherche</h2>
        <div className="mb-4">
          <label htmlFor="radius" className="block text-gray-700">
            Rayon de recherche : {filterRadius} km
          </label>
          <input
            id="radius"
            type="range"
            min="1"
            max="50"
            step="1"
            value={filterRadius}
            onChange={handleRadiusChange}
            className="w-full bg-blue-100 rounded-lg"
          />
        </div>
      </section>

      {/* Divisions et activités */}
      <section className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">🌍 Divisions et Activités</h2>

        {arborescence.map((division: any) => (
          <div key={division.code} className="space-y-2">
            {/* Division */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleDivision(division.code)}
                className="text-blue-600 hover:text-blue-800"
              >
                {expandedDivisions.includes(division.code) ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              <label
                onClick={() => toggleDivisionSelection(division.code)}
                className="cursor-pointer text-sm font-semibold text-gray-800"
              >
                {division.nom}
              </label>
            </div>

            {/* Activités */}
            {expandedDivisions.includes(division.code) && (
              <div className="ml-4 space-y-2">
                {division.activites.map((activity: string) => (
                  <div key={activity} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDivisions.includes(activity)}
                      onChange={() => toggleActivitySelection(activity)}
                      id={`activity-${activity}`}
                      className="rounded-md"
                    />
                    <label htmlFor={`activity-${activity}`} className="text-sm text-gray-600">{activity}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Clients & Prospects section */}
      <section className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">👥 Clients & Prospects</h2>

        <div className="flex gap-2">
          <button
            onClick={onClearRecherche}
            className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 text-sm"
          >
            Supprimer "Recherche"
          </button>
          <button
            onClick={clearAllData}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm"
          >
            <FaTrashAlt className="inline mr-1" /> Tout effacer
          </button>
        </div>

        <ul className="text-sm space-y-2 max-h-72 overflow-y-auto pr-2">
          {data.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 p-2 rounded-lg border border-gray-200 bg-white relative hover:shadow-md cursor-pointer transition-all hover:bg-gray-100"
            >
              <div className="font-semibold text-gray-800">{item.Nom}</div>
              {item.Adresse && (
                <div className="text-xs text-gray-500">
                  {item.Adresse}
                  {item.Distance && (
                    <span className="ml-2 text-blue-500 font-semibold">
                      ({item.Distance} km)
                    </span>
                  )}
                </div>
              )}
              {item.Secteur && (
                <div className="text-xs italic text-gray-400">
                  Secteur : {item.Secteur}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onSetType(item.Nom, "Client")}
                  className="bg-green-100 text-green-700 py-1 px-2 rounded-lg text-xs"
                >
                  Client
                </button>
                <button
                  onClick={() => onSetType(item.Nom, "Prospect")}
                  className="bg-yellow-100 text-yellow-700 py-1 px-2 rounded-lg text-xs"
                >
                  Prospect
                </button>
                <button
                  onClick={() => onRemoveItem(item.Nom)}
                  className="bg-red-100 text-red-700 py-1 px-2 rounded-lg text-xs"
                >
                  <FaTrashAlt />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Cache clear button */}
      <div className="mt-4">
        <button
          onClick={onClearCache}
          className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 text-sm"
        >
          🗑️ Vider le cache
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
