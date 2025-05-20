import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { EntrepriseType, EmployeesCategory, EmployeesCategoriesByType } from '../type.ts';

export interface FilterValues {
  name: string;
  industry: string;
  type: EntrepriseType;
  employees: EmployeesCategory;
  radius: number;
}

interface SidebarProps {
  onApplyFilters: (filters: FilterValues) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onApplyFilters }) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [type, setType] = useState<EntrepriseType>(EntrepriseType.Recherche);
  const [employees, setEmployees] = useState<EmployeesCategory>(EmployeesCategoriesByType[type][0]);
  const [radius, setRadius] = useState(20);

  // Mettre à jour la liste des employés quand le type change
  useEffect(() => {
    const allowed = EmployeesCategoriesByType[type];
    if (!allowed.includes(employees)) {
      setEmployees(allowed[0]);
    }
    onApplyFilters({ name, industry, type, employees, radius });
  }, [type]);

  // Appliquer le rayon automatiquement
  useEffect(() => {
    onApplyFilters({ name, industry, type, employees, radius });
  }, [radius]);

  const handleSearchClick = () => {
    toast.info('La recherche sera bientôt disponible');
  };

  const handleApplyClick = () => {
    onApplyFilters({ name, industry, type, employees, radius });
    // toast.success('Filtres appliqués');
  };

  const employeeOptions = EmployeesCategoriesByType[type];

  return (
    <aside className="sidebar">
      <button className="btn-primary mb-4" onClick={handleSearchClick}>
        Rechercher
      </button>
      <input
        type="text"
        className="search"
        placeholder="Rechercher entreprises"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <h2>Filtrer les résultats</h2>

      <div className="filter-group">
        <label htmlFor="business-name">Nom de l'entreprise</label>
        <input
          type="text"
          id="business-name"
          placeholder="Ex : Aube"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="industry">Secteur</label>
        <select id="industry" value={industry} onChange={e => setIndustry(e.target.value)}>
          <option value="">Ex : Construction</option>
          <option value="Construction">Construction</option>
          <option value="Software">Logiciel</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="type">Type</label>
        <select id="type" value={type} onChange={e => setType(e.target.value as EntrepriseType)}>
          {Object.values(EntrepriseType).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="employees">Effectifs</label>
        <select id="employees" value={employees} onChange={e => setEmployees(e.target.value as EmployeesCategory)}>
          {employeeOptions.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="slider-group">
        <span>Rayon</span>
        <input
          type="range"
          min="1"
          max="50"
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
        />
        <span>{radius} km</span>
      </div>

      <button className="btn-primary" onClick={handleApplyClick}>
        Appliquer les filtres
      </button>
    </aside>
  );
};

export default Sidebar;
