// src/components/CreateGroup.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import { FaImage, FaUsers, FaBriefcase, FaArrowLeft } from "react-icons/fa";

const CreateGroup = () => {
  const [name, setName] = useState("");
  const [type, setType] = useState("budget"); // "budget" or "split"
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadGroupImage = async () => {
    if (!image) return null;
    
    const storageRef = ref(storage, `group-images/${user.uid}_${Date.now()}`);
    await uploadBytes(storageRef, image);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    
    if (type === "budget" && (!budget || isNaN(budget) || Number(budget) <= 0)) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Upload image if selected
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadGroupImage();
      }
      
      // Create group in Firestore
      const groupData = {
        name: name.trim(),
        type,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        imageUrl,
        currency,
        invites: [],
      };
      
      // Add budget if it's a budget group
      if (type === "budget") {
        groupData.budget = Number(budget);
        groupData.spent = 0;
      }
      
      const docRef = await addDoc(collection(db, "groups"), groupData);
      
      toast.success("Group created successfully!");
      navigate(`/group/${docRef.id}`);
      
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <h1 className="heading-lg">Create New Group</h1>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
          {/* Group image */}
          <div className="flex flex-col items-center">
            <div 
              className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer mb-2 overflow-hidden"
              onClick={() => fileInputRef.current.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <FaImage className="text-gray-400 text-3xl" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Upload group image
            </span>
          </div>
          
          {/* Group name */}
          <div>
            <label className="form-label">Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input mt-1"
              required
            />
          </div>
          
          {/* Group type selection */}
          <div>
            <label className="form-label mb-3">Group Type</label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer ${
                  type === "budget" 
                  ? "border-primary bg-primary-light" 
                  : "border-gray-300 dark:border-gray-700"
                }`}
                onClick={() => setType("budget")}
              >
                <FaBriefcase className={`text-2xl mb-2 ${
                  type === "budget" ? "text-primary" : "text-gray-500 dark:text-gray-400"
                }`} />
                <span className={type === "budget" ? "font-medium text-primary" : "text-gray-700 dark:text-gray-300"}>
                  Team Budget
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Central budget managed by team
                </p>
              </div>
              
              <div
                className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer ${
                  type === "split" 
                  ? "border-primary bg-primary-light" 
                  : "border-gray-300 dark:border-gray-700"
                }`}
                onClick={() => setType("split")}
              >
                <FaUsers className={`text-2xl mb-2 ${
                  type === "split" ? "text-primary" : "text-gray-500 dark:text-gray-400"
                }`} />
                <span className={type === "split" ? "font-medium text-primary" : "text-gray-700 dark:text-gray-300"}>
                  Split Expenses
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Share and split costs with friends
                </p>
              </div>
            </div>
          </div>
          
          {/* Budget amount (only for budget type) */}
          {type === "budget" && (
            <div>
              <label className="form-label">Group Budget</label>
              <div className="flex">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-700 rounded-l-lg bg-gray-50 dark:bg-gray-800"
                >
                  <option value="USD">$</option>
                  <option value="EUR">€</option>
                  <option value="GBP">£</option>
                  <option value="JPY">¥</option>
                </select>
                <input
                  type="number"
                  placeholder="Enter budget amount"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="form-input rounded-l-none w-full"
                  required={type === "budget"}
                />
              </div>
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;