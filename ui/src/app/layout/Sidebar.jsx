import { NavLink } from 'react-router-dom';
import { Languages, Moon, Sun } from 'lucide-react';
import { routes } from '../routes';

export default function Sidebar({ darkMode, toggleDark }) {
  return (
    <nav className="sidebar">
      <div className="logo">
        <Languages size={24} strokeWidth={2} />
        Translate
      </div>
      <ul>
        {routes.filter((r) => r.label).map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.path}>
              <NavLink to={r.path} end={r.path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {Icon && <Icon size={20} strokeWidth={2} />}
                {r.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
      <div className="sidebar-footer">
        <button className="dark-toggle" onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </nav>
  );
}
