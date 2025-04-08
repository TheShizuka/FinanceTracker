// src/pages/Profile.jsx
import { useEffect, useState, useRef } from "react";
import { db, auth, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { 
  FaArrowLeft, 
  FaUser, 
  FaCamera, 
  FaCopy, 
  FaMoon, 
  FaSun, 
  FaSignOutAlt,
  FaCheck,
  FaUserEdit
} from "react-icons/fa";

const Profile = ({ toggleTheme }) => {
  const [profile, setProfile] = useState({ username: "", handle: "", photoURL: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  // Use a ref to store the current budget to ensure it's always up-to-date
  const handleRef = useRef("");
  
  // If toggleTheme is not passed as a prop, provide a fallback
  const handleToggleTheme = toggleTheme || (() => {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");
    if (isDark) {
      html.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    } else {
      html.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    }
  });

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
          const profileData = snapshot.data();
          setProfile(profileData);
          handleRef.current = profileData.handle || "";
        } else {
          const defaultProfile = {
            username: user.displayName || "",
            handle: generateUniqueHandle(user.displayName || "user"),
            photoURL: "",
          };
          setProfile(defaultProfile);
          handleRef.current = defaultProfile.handle;
          
          // Save the default profile
          await setDoc(docRef, defaultProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Error loading profile");
      }
    };
    
    fetchProfile();
  }, [user]);

  const generateUniqueHandle = (baseName) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `@${baseName.toLowerCase().replace(/\s+/g, '')}${randomNum}`;
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }
    
    setUploading(true);
    
    try {
      const encodedName = encodeURIComponent(file.name);
      const storageRef = ref(storage, `profilePictures/${user.uid}/${encodedName}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setProfile((prev) => ({ ...prev, photoURL: url }));
      toast.success("Profile picture uploaded!");
    } catch (error) {
      console.error(error);
      toast.error("Error uploading image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!profile.username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    
    setSaving(true);
    
    try {
      await setDoc(doc(db, "users", user.uid), profile, { merge: true });
      toast.success("Profile updated!");
    } catch (error) {
      console.error(error);
      toast.error("Error updating profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully!");
      navigate("/login");
    } catch (error) {
      console.error(error);
      toast.error("Error signing out: " + error.message);
    }
  };

  // Fixed copy handle function with proper error handling
  const copyUID = () => {
    // Use the handleRef to ensure we always have the latest value
    const handleToCopy = profile.handle || handleRef.current;
    
    // Check if handle exists before copying
    if (!handleToCopy) {
      toast.error("No handle available to copy");
      return;
    }
    
    // Use clipboard API with proper error handling
    try {
      navigator.clipboard.writeText(handleToCopy);
      setCopiedHandle(true);
      toast.success("Handle copied to clipboard!");
      
      setTimeout(() => {
        setCopiedHandle(false);
      }, 2000);
    } catch (err) {
      console.error("Could not copy handle: ", err);
      
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = handleToCopy;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedHandle(true);
          toast.success("Handle copied to clipboard!");
          
          setTimeout(() => {
            setCopiedHandle(false);
          }, 2000);
        } else {
          throw new Error("Copy command failed");
        }
      } catch (e) {
        toast.error("Failed to copy handle");
      }
      
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fadeIn">
      <div className="mb-6 flex items-center">
          <button 
      onClick={() => navigate("/")} 
      className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
      aria-label="Go to home"
    >
      <FaArrowLeft />
    </button>
        <h1 className="heading-lg">Profile</h1>
      </div>
      
      {/* Profile picture section */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative group">
            <div className="w-24 h-24 mb-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
              {profile.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaUser className="w-12 h-12 text-gray-400" />
              )}
            </div>
            
            <button
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white shadow-md hover:bg-primary-dark transition-colors"
              disabled={uploading}
            >
              {uploading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <FaCamera size={18} />
              )}
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          <h2 className="text-lg font-semibold">{profile.username || "User"}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile.handle || "@user"}</p>
        </div>
      </div>
      
      {/* Profile form */}
      <div className="card p-4 mb-6">
        <div className="mb-4">
          <label htmlFor="username" className="form-label">Username</label>
          <div className="relative mt-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none icon-container">
            <FaUserEdit className="text-gray-400" />
          </div>
          <input
            type="text"
            id="username"
            className="form-input pl-10 form-input-with-icon"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            placeholder="Enter your username"
          />
        </div>
        </div>
        
        <div>
          <label className="form-label">Your Handle</label>
          <div className="relative mt-1">
            <input
              type="text"
              readOnly
              value={profile.handle}
              className="form-input pr-10 bg-gray-50 dark:bg-gray-700 cursor-default"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button 
                onClick={copyUID} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                aria-label="Copy UID"
              >
                {copiedHandle ? <FaCheck className="text-green-500" /> : <FaCopy />}
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Share your handle with friends to connect
          </p>
        </div>
      </div>
      
      {/* Settings */}
      <div className="card p-4 mb-6">
        <h2 className="heading-sm mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 mr-3">
                <FaMoon className="text-purple-500" />
              </div>
              <span>Dark Mode</span>
            </div>
            <button
              onClick={handleToggleTheme}
              className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              role="switch"
            >
              <span
                className={`${
                  document.documentElement.classList.contains("dark") ? "bg-primary" : "bg-gray-300"
                } absolute w-full h-full rounded-full transition-colors`}
              />
              <span
                className={`${
                  document.documentElement.classList.contains("dark") ? "translate-x-6 bg-white" : "translate-x-1 bg-white"
                } inline-block w-4 h-4 transform rounded-full transition-transform`}
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Save profile and logout buttons */}
      <div className="flex flex-col space-y-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary py-3"
        >
          {saving ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving Profile...
            </span>
          ) : (
            "Save Profile"
          )}
        </button>
        
        <button
          onClick={handleLogout}
          className="btn py-3 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
        >
          <FaSignOutAlt className="mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;