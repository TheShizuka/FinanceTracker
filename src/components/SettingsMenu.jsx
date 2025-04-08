// src/components/SettingsMenu.jsx
import { useState } from "react";

const SettingsMenu = ({ darkMode, toggleDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Settings
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
          <div className="p-4">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} className="form-checkbox" />
              <span className="dark:text-gray-200">Dark Mode</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
