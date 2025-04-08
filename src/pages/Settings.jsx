// src/pages/Settings.jsx
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import BackButton from "../components/BackButton";

const Settings = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully!");
      window.location.href = "/login";
    } catch (error) {
      toast.error("Error signing out.");
    }
  };

  return (
    <div className="p-6 relative">
      <BackButton />
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <button onClick={handleLogout} className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors">
        Disconnect (Log Out)
      </button>
    </div>
  );
};

export default Settings;
