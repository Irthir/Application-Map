import React from "react";

interface PanelTabProps {
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const PanelTab: React.FC<PanelTabProps> = ({ title, count, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full p-2 text-left rounded ${
        isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
      } hover:bg-blue-600 transition-all`}
    >
      <span>{title}</span>
      <span className="bg-white text-black px-2 py-1 rounded-full text-xs">
        {count}
      </span>
    </button>
  );
};

export default PanelTab;
