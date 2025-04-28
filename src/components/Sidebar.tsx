import { useState } from "react";
import SearchAPE from "./SearchAPE";
import FiltreSecteurs from "./FiltreSecteurs";
import { FaEye, FaEyeSlash, FaMapMarkerAlt, FaTimes, FaFileCsv, FaTrashAlt } from "react-icons/fa";
import { DataPoint } from "../type.ts";
import { toast } from "react-hot-toast";

interface SidebarProps {
  data: DataPoint[];
  onUpload: (data: DataPoint[]) => void;
  onFilter: (radius: number) => void;
  onSearchResults: (data: any[]) => void;
  onCenter: (lat: number, lon: number) => void;
  onToggleVisibility: (nom: string) => void;
  hiddenMarkers: string[];
  onSetType: (nom: string, type: "Client" | "Prospect") => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
  onRemoveItem: (nom: string) => void;
  mapCenter: [number, number];
  filterRadius: number;
  setFilterRadius: (radius: number) => void;
  onClearRecherche: () => void;
}

const Sidebar = ({
  data,
  onUpload,
  onFilter,
  onSearchResults,
  onCenter,
  onToggleVisibility,
  hiddenMarkers,
  onSetType,
  onExport,
  onDownloadTemplate,
  onRemoveItem,
  mapCenter,
  filterRadius,
  setFilterRadius,
  onClearRecherche,
}: SidebarProps) => {
  const [globalLoading, setGlobalLoading] = useState(false);

  const handleRadiusChange = (radius: number) => {
    setFilterRadius(radius);
    onFilter(radius);
  };

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
          onRadiusChange={handleRadiusChange}
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
              {item.Adresse && <div className="text-xs text-gray-500">{item.Adresse}</div>}
              {item.Secteur && <div className="text-xs italic text-gray-400">{item.Secteur}</div>}

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => onCenter(item.Latitude, item.Longitude)}
                  className="p-1 rounded bg-blue-100 hover:bg-blue-200"
                  title="Centrer sur la carte"
                >
                  <FaMapMarkerAlt className="text-blue-600" />
                </button>

                <button
                  onClick={() => onToggleVisibility(item.Nom)}
                  className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                  title={hiddenMarkers.includes(item.Nom) ? "Afficher" : "Masquer"}
                >
                  {hiddenMarkers.includes(item.Nom) ? <FaEyeSlash /> : <FaEye />}
                </button>

                {/* 🔵 Correction code NAF non valide */}
                {item.CodeNAF && item.CodeNAF.length >= 5 ? (
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("search-similar", { detail: { nom: item.Nom, naf: item.CodeNAF } })
                      )
                    }
                    className="p-1 rounded bg-indigo-100 hover:bg-indigo-200 text-xs"
                    title="Rechercher similaires"
                  >
                    🔍 Similaires
                  </button>
                ) : (
                  <button
                    onClick={() => toast.error("❗ Aucun code NAF valide pour cette entreprise")}
                    className="p-1 rounded bg-gray-200 text-gray-400 text-xs"
                    title="Code NAF manquant"
                  >
                    🚫
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-1 text-xs">
                <button
                  onClick={() => onSetType(item.Nom, "Client")}
                  className="flex-1 bg-green-100 text-green-700 py-1 rounded hover:bg-green-200"
                >
                  Client
                </button>
                <button
                  onClick={() => onSetType(item.Nom, "Prospect")}
                  className="flex-1 bg-yellow-100 text-yellow-700 py-1 rounded hover:bg-yellow-200"
                >
                  Prospect
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.Nom)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-lg"
                title="Supprimer"
              >
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Export section */}
      <section className="space-y-2 border-t pt-4">
        <h2 className="text-lg font-semibold text-gray-700">📦 Exporter</h2>

        <button
          onClick={onExport}
          className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 rounded hover:from-blue-600 hover:to-blue-800"
        >
          <FaFileCsv className="mr-2" /> Exporter CSV
        </button>

        <button
          onClick={onDownloadTemplate}
          className="w-full flex items-center justify-center bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200"
        >
          <FaFileCsv className="mr-2" /> Télécharger modèle
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
