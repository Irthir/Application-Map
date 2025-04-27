import { useState } from "react";
import SearchAPE from "./SearchAPE";
import FiltreSecteurs from "./FiltreSecteurs";
import { FaEye, FaEyeSlash, FaMapMarkerAlt, FaTimes, FaFileCsv } from "react-icons/fa";
import { DataPoint } from "../type.ts";
import { toast } from "react-hot-toast";

interface SidebarProps {
  data: DataPoint[];
  onUpload: (data: DataPoint[]) => void;
  onFilter: (radius: number) => void;
  onSearchResults: (data: any) => void;
  onCenter: (lat: number, lon: number) => void;
  onToggleVisibility: (nom: string) => void;
  hiddenMarkers: string[];
  onSetType: (nom: string, type: "Client" | "Prospect") => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
  onRemoveItem: (nom: string) => void;
  mapCenter: [number, number];
  filterRadius: number | null;
  setFilterRadius: (radius: number | null) => void;
  onClearRecherche: () => void;
}

const Sidebar = ({
  data,
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

  return (
    <aside className="sidebar">
      <h1 className="text-2xl font-bold mb-4">Application Map</h1>

      {globalLoading && (
        <div className="bg-blue-100 text-blue-700 p-2 mb-2 text-center text-sm rounded animate-pulse">
          🔄 Recherche en cours...
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-2">Recherche</h2>
        <SearchAPE onResults={(data) => wrappedOnSearchResults(Promise.resolve(data))} />
        <FiltreSecteurs
          center={mapCenter}
          onSearchResults={(data) => wrappedOnSearchResults(Promise.resolve(data))}
          radius={filterRadius || 5}
          onRadiusChange={handleRadiusChange}
        />
      </section>

      <section className="mt-4">
        <h2 className="font-semibold mb-2">Clients & Prospects</h2>

        <button
          onClick={onClearRecherche}
          className="mb-2 w-full bg-red-100 text-red-700 py-1 rounded hover:bg-red-200"
        >
          Supprimer les marqueurs de type "Recherche"
        </button>

        <ul className="text-sm space-y-1">
          {data.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 p-2 rounded border border-gray-200 relative hover:shadow-md transition bg-white"
            >
              <div className="text-left font-semibold">{item.Nom}</div>

              {item.Adresse && (
                <div className="text-xs text-gray-600">{item.Adresse}</div>
              )}
              {item.Secteur && (
                <div className="text-xs text-gray-500 italic">{item.Secteur}</div>
              )}

              <div className="flex items-center gap-2 mt-1">
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
                  {hiddenMarkers.includes(item.Nom) ? (
                    <FaEyeSlash className="text-blue-600" />
                  ) : (
                    <FaEye className="text-blue-600" />
                  )}
                </button>

                {item.Secteur && (
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("search-similar", { detail: { nom: item.Nom, naf: item.Secteur } })
                      )
                    }
                    className="p-1 rounded bg-indigo-100 hover:bg-indigo-200 text-xs"
                    title="Rechercher similaires"
                  >
                    🔍 Similaires
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-1 text-xs">
                <button
                  onClick={() => onSetType(item.Nom, "Client")}
                  className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                >
                  Client
                </button>
                <button
                  onClick={() => onSetType(item.Nom, "Prospect")}
                  className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                >
                  Prospect
                </button>
              </div>

              <button
                onClick={() => onRemoveItem(item.Nom)}
                className="absolute top-1 right-1 text-gray-400 hover:text-red-600 text-sm"
                style={{ background: "transparent", border: "none" }}
                title="Supprimer"
              >
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 space-y-2">
        <h2 className="font-semibold mb-2">Exporter</h2>

        <button
          onClick={onExport}
          className="w-full flex items-center justify-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          <FaFileCsv className="mr-2" /> Exporter CSV
        </button>

        <button
          onClick={onDownloadTemplate}
          className="w-full flex items-center justify-center bg-gray-200 text-black py-2 rounded hover:bg-gray-300"
        >
          <FaFileCsv className="mr-2" /> Télécharger modèle import
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
