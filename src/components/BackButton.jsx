// src/components/BackButton.jsx
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const BackButton = () => {
  const navigate = useNavigate();
  
  return (
    <button 
      onClick={() => navigate("/")} 
      className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
      aria-label="Go to home"
    >
      <FaArrowLeft />
    </button>
  );
};

export default BackButton;