import React, { useState, useEffect } from "react";
import { DataPoint } from "../type";
import { FaMapMarkerAlt, FaEye, FaEyeSlash, FaTrashAlt, FaSearch, FaChevronUp, FaChevronDown } from "react-icons/fa";

interface FloatingPanelProps {
  data: DataPoint[];
  onCenter: (lat: number, lon: number) => void;
  onRemoveItem: (nom: string) => void;
  onToggleVisibility: (nom: string) => void;
  hiddenMarkers: string[];
  filterRadius: number;
  onFilter: (radius: number) => void;
  activeTab: "Recherche" | "Clients" | "Prospects";
  setActiveTab: (tab: "Recherche" | "Clients" | "Prospects") => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  data,
  onCenter,
  onRemoveItem,
  onToggleVisibility,
  hiddenMarkers,
  activeTab,
  setActiveTab,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<DataPoint[]>(data);

  useEffect(() => {
    const filtered = data.filter(
      (item) =>
        (activeTab === "Recherche" && item.Type === "Recherche") ||
        (activeTab === "Clients" && item.Type === "Client") ||
        (activeTab === "Prospects" && item.Type === "Prospect")
    );

    const finalFiltered = filtered.filter(
      (item) =>
        item.Nom.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (sectorFilter ? item.Secteur === sectorFilter : true)
    );

    setFilteredData(finalFiltered);
  }, [data, searchTerm, sectorFilter, activeTab]);

  const uniqueSectors = Array.from(
    new Set(
      data
        .filter((item) => item.Type === activeTab || activeTab === "Recherche")
        .map((item) => item.Secteur)
    )
  ).filter(Boolean);

  const handleTabChange = (tab: "Recherche" | "Clients" | "Prospects") => {
    setActiveTab(tab);
    setSearchTerm("");
    setSectorFilter(null);
  };

  const [isHidden, setIsHidden] = useState<boolean>(false);
  const togglePanelVisibility = () => {
    setIsHidden(!isHidden);
  };

  return (
    <>
      <button
        onClick={togglePanelVisibility}
        className={`reveal-btn ${isHidden ? "hidden" : ""}`}
      >
        {isHidden ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      <div className={`floating-panel ${isHidden ? "hidden" : ""}`}>
        <button onClick={togglePanelVisibility} className="toggle-btn">
          {isHidden ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        <div className="tabs">
          {["Recherche", "Clients", "Prospects"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabChange(tab as "Recherche" | "Clients" | "Prospects")}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
          />
        </div>

        <select
          value={sectorFilter || ""}
          onChange={(e) => setSectorFilter(e.target.value || null)}
          className="sector-filter"
        >
          <option value="">Tous les secteurs</option>
          {uniqueSectors.map((sector, index) => (
            <option key={index} value={sector}>
              {sector}
            </option>
          ))}
        </select>

        <div className="panel-content">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <div
                key={index}
                className={`panel-item ${hiddenMarkers.includes(item.Nom) ? "hidden-item" : ""}`}
              >
                <div className="item-header">
                  <h4>{item.Nom}</h4>
                  <span>
                    {item.Secteur} — {item.CodeNAF}
                  </span>
                </div>
                <div className="item-address">{item.Adresse}</div>
                <div className="item-actions">
                  <button
                    onClick={() => onCenter(item.Latitude, item.Longitude)}
                    className="action-btn"
                    title="Centrer sur la carte"
                  >
                    <FaMapMarkerAlt />
                  </button>
                  <button
                    onClick={() => onToggleVisibility(item.Nom)}
                    className="action-btn"
                    title={hiddenMarkers.includes(item.Nom) ? "Afficher" : "Masquer"}
                  >
                    {hiddenMarkers.includes(item.Nom) ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.Nom)}
                    className="action-btn remove"
                    title="Supprimer"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">Aucun résultat</div>
          )}
        </div>
      </div>
    </>
  );
};

export default FloatingPanel;
