import { useState } from "react";

interface SidebarProps {
  onSearch: (query: string) => void;
  onFilter: (filters: {
    businessName: string;
    industry: string;
    employees: string;
    radius: number;
  }) => void;
  industries: string[];
}

const employeeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
];

const Sidebar = ({ onSearch, onFilter, industries }: SidebarProps) => {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [employees, setEmployees] = useState("");
  const [radius, setRadius] = useState(20);

  const handleApplyFilters = () => {
    onFilter({ businessName, industry, employees, radius });
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-80 p-6 bg-white shadow-lg z-10">
      {/* Search Input */}
      <input
        type="text"
        placeholder="search businesses"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch(businessName);
        }}
        className="w-full p-2 border border-gray-300 rounded"
      />

      {/* Filter Results Header */}
      <h2 className="mt-6 text-xl font-semibold">Filter results</h2>

      {/* Filter Fields */}
      <div className="mt-4 space-y-4">
        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded"
          >
            <option value="">E.g. construction</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Employees */}
        <div>
          <label htmlFor="employees" className="block text-sm font-medium text-gray-700">
            Employees
          </label>
          <select
            id="employees"
            value={employees}
            onChange={(e) => setEmployees(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Select...</option>
            {employeeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Radius Slider */}
        <div>
          <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
            Radius: {radius} km
          </label>
          <input
            id="radius"
            type="range"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApplyFilters}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Apply filters
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
