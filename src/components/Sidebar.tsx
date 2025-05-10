import { useState } from "react";
import SearchAPE from "./SearchAPE";
import FiltreSecteurs from "./FiltreSecteurs";
import { FaTrashAlt } from "react-icons/fa";
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
  onSetType: (nom: string, type: "Client" | "Prospect") => void; // Ajout de onSetType
  onRemoveItem: (nom: string) => void; // Ajout de onRemoveItem
}

const Sidebar = ({
  data,
  onUpload,
  onSearchResults,
  mapCenter,
  filterRadius,
  onClearRecherche,
  onClearCache,
  onSetType,
  onRemoveItem
}: SidebarProps) => {
  const [globalLoading, setGlobalLoading] = useState(false);

  const wrappedOnSearchResults = async (promise: Promise<any[]>) => {
    setGlobalLoading(true);
    try {
      const results = await promise;
      if (results.length === 0) {
        toast.error("❗ Aucun résultat trouvé.");
      } else {
        onSearchResults(results);
        toast.success(`✅ ${results.length} résultat(s) ajouté(s) !`);
      }
    } catch (err) {
      console.error("Erreur lors du traitement des résultats :", err);
      toast.error("❗ Erreur lors du traitement des résultats.");
    } finally {
      setGlobalLoading(false);
    }
  };

  const clearAllData = () => {
    if (confirm("Voulez-vous vraiment tout supprimer ?")) {
      onUpload([]);
      toast.success("🗑️ Données effacées !");
    }
  };

  return (
    <aside className="sidebar p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Application Map</h1>

      {globalLoading && (
        <div className="bg-blue-100 text-blue-700 p-2 text-center text-sm rounded animate-pulse">
          🔄 Recherche en cours...
        </div>
      )}

      {/* Recherche section */}
      <section className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">🔎 Recherche</h2>
        <SearchAPE onResults={(data) => wrappedOnSearchResults(Promise.resolve(data))} />
        <FiltreSecteurs
          center={mapCenter}
          onSearchResults={(data) => wrappedOnSearchResults(Promise.resolve(data))}
          radius={filterRadius}
        />
      </section>

      {/* Clients & Prospects section */}
      <section className="space-y-4 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">👥 Clients & Prospects</h2>

        <div className="flex gap-2">
          <button
            onClick={onClearRecherche}
            className="flex-1 bg-red-100 text-red-700 py-2 rounded hover:bg-red-200 text-sm"
          >
            Supprimer "Recherche"
          </button>
          <button
            onClick={clearAllData}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 text-sm"
          >
            <FaTrashAlt className="inline mr-1" /> Tout effacer
          </button>
        </div>

        <ul className="text-sm space-y-2 max-h-72 overflow-y-auto pr-2">
          {data.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 p-2 rounded border border-gray-200 bg-white relative hover:shadow-md"
            >
              <div className="font-semibold">{item.Nom}</div>
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
                  className="bg-green-100 text-green-700 py-1 px-2 rounded text-xs"
                >
                  Client
                </button>
                <button
                  onClick={() => onSetType(item.Nom, "Prospect")}
                  className="bg-yellow-100 text-yellow-700 py-1 px-2 rounded text-xs"
                >
                  Prospect
                </button>
                <button
                  onClick={() => onRemoveItem(item.Nom)}
                  className="bg-red-100 text-red-700 py-1 px-2 rounded text-xs"
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
          className="w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 text-sm"
        >
          🗑️ Vider le cache
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
