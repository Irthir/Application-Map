//import ImportCSV from "./Import";
//import Filter from "./Filtre";
import SearchAPE from "./SearchAPE";
import FiltreINSEEHierarchique from "./FiltreINSEEHiérarchique";
import { FaEye, FaEyeSlash, FaMapMarkerAlt, FaTimes } from "react-icons/fa";

interface DataPoint {
  Nom: string;
  Latitude: number;
  Longitude: number;
  Type: string;
}

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
  onRemoveItem: (nom: string) => void;
  mapCenter: [number, number];
  filterRadius: number | null;
  setFilterRadius: (radius: number | null) => void;
}

const Sidebar = ({
  data,
  //onUpload,
  onFilter,
  onSearchResults,
  onCenter,
  onToggleVisibility,
  hiddenMarkers,
  onSetType,
  onExport,
  onRemoveItem,
  mapCenter,
  filterRadius,
  setFilterRadius,
}: SidebarProps) => {
  const handleRadiusChange = (radius: number) => {
    setFilterRadius(radius);
    onFilter(radius);
  };

  return (
    <aside className="sidebar">
      <h1 className="text-2xl font-bold mb-4">Application Map</h1>

      {/*<section className="mt-4">
        <h2 className="font-semibold mb-2">Importer des données</h2>
        <ImportCSV onUpload={onUpload} />
      </section>*/}

      <section>
        <h2 className="font-semibold mb-2">Recherche</h2>
        <SearchAPE onResults={onSearchResults} />
        <FiltreINSEEHierarchique
          center={mapCenter}
          onSearchResults={onSearchResults}
          radius={filterRadius || 5}  // Utiliser 5 si filterRadius est null ou undefined
          onRadiusChange={handleRadiusChange}
        />

      </section>

      <section>
        <h2 className="font-semibold mb-2">Clients & Prospects</h2>
        <ul className="text-sm space-y-1">
          {data.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 p-2 rounded border border-gray-200 relative hover:shadow-md transition bg-white"
            >
              <div className="text-left font-semibold">{item.Nom}</div>

              <div className="flex items-center gap-2">
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
                  title={
                    hiddenMarkers.includes(item.Nom)
                      ? "Afficher sur la carte"
                      : "Masquer sur la carte"
                  }
                >
                  {hiddenMarkers.includes(item.Nom) ? (
                    <FaEyeSlash className="text-blue-600" />
                  ) : (
                    <FaEye className="text-blue-600" />
                  )}
                </button>
              </div>

              <div className="flex gap-2 mt-1 text-xs">
                <button
                  onClick={() => onSetType(item.Nom, "Client")}
                  className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                >
                  Marquer Client
                </button>
                <button
                  onClick={() => onSetType(item.Nom, "Prospect")}
                  className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                >
                  Marquer Prospect
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

      
      
      <section className="mt-4">
      <h2 className="font-semibold mb-2">Exporter les données</h2>
        <button
          onClick={onExport}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Exporter les données en CSV
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
