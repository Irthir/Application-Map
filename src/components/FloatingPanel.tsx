// src/components/FloatingPanel.tsx
import React, { useState } from "react";
import { DataPoint } from "../type";
import {
  FaMapMarkerAlt,
  FaEye,
  FaEyeSlash,
  FaTrashAlt,
  FaSearch,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";

interface FloatingPanelProps {
  data: DataPoint[];
  onCenter: (lat: number, lon: number) => void;
  onRemoveItem: (nom: string) => void;
  onToggleVisibility: (nom: string) => void;
  hiddenMarkers: string[];
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  data,
  onCenter,
  onRemoveItem,
  onToggleVisibility,
  hiddenMarkers,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [isHidden, setIsHidden] = useState<boolean>(false);

  // Toggle panel
  const togglePanel = () => setIsHidden((prev) => !prev);

  // Filtered list
  const filtered = data.filter((item) => {
    const matchName = item.Nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSector = sectorFilter ? item.Secteur === sectorFilter : true;
    return matchName && matchSector;
  });

  const sectors = Array.from(new Set(data.map((d) => d.Secteur).filter(Boolean)));

  return (
    <>
      <div className={`floating-panel ${isHidden ? "hidden" : ""}`}>
        <div className="tabs">
          <button className="toggle-btn" onClick={togglePanel} title="Fermer">
            <FaChevronDown />
          </button>
          <div className="search-bar">
            <FaSearch />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="sector-filter"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="">Tous les secteurs</option>
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-content">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div key={item.Nom} className="panel-item">
                <div className="item-header">
                  <span>{item.Nom}</span>
                  <span>{item.Secteur}</span>
                </div>
                <div className="item-actions">
                  <button onClick={() => onCenter(item.Latitude, item.Longitude)}>
                    <FaMapMarkerAlt />
                  </button>
                  <button onClick={() => onToggleVisibility(item.Nom)}>
                    {hiddenMarkers.includes(item.Nom) ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  <button onClick={() => onRemoveItem(item.Nom)}>
                    <FaTrashAlt />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">Aucun élément</div>
          )}
        </div>
      </div>

      {/* Reveal button */}
      {isHidden && (
        <button className="reveal-btn" onClick={togglePanel} title="Ouvrir">
          <FaChevronUp />
        </button>
      )}
    </>
  );
};

export default FloatingPanel;
