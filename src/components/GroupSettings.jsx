// src/components/GroupSettings.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { 
  doc, getDoc, updateDoc, deleteDoc, 
  collection, query, where, getDocs, arrayRemove 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import { 
  FaImage, FaUsers, FaEdit, FaTrash, FaArrowLeft,
  FaDollarSign, FaSignOutAlt, FaEuroSign, 
  FaYenSign, FaPoundSign 
} from "react-icons/fa";

const GroupSettings = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const fileInputRef = useRef(null);
  
  const [group, setGroup] = useState(null);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const docSnap = await getDoc(doc(db, "groups", groupId));
        if (docSnap.exists()) {
          const groupData = { id: docSnap.id, ...docSnap.data() };
          
          // Security check - verify if user is a member of this group
          if (!groupData.members.includes(user.uid)) {
            setAccessDenied(true);
            setIsLoading(false);
            return;
          }
          
          // Only the creator can access settings
          if (groupData.createdBy !== user.uid) {
            setAccessDenied(true);
            setIsLoading(false);
            return;
          }
          
          setGroup(groupData);
          setName(groupData.name || "");
          setBudget(groupData.budget || "");
          setCurrency(groupData.currency || "USD");
          setImagePreview(groupData.imageUrl || null);
        } else {
          toast.error("Group not found");
          navigate("/groups");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching group:", error);
        toast.error("Error loading group details");
        navigate("/groups");
      }
    };
    
    fetchGroup();
  }, [groupId, navigate, user]);
  
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
    if (!image) return group?.imageUrl || null;
    
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
    
    if (group.type === "budget" && (!budget || isNaN(budget) || Number(budget) <= 0)) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Upload image if changed
      let imageUrl = group.imageUrl;
      if (image) {
        imageUrl = await uploadGroupImage();
      }
      
      // Update group in Firestore
      const updateData = {
        name: name.trim(),
        currency,
        imageUrl,
        updatedAt: new Date().toISOString() // Force calculations to update
      };
      
      // Add budget if it's a budget group
      if (group.type === "budget") {
        updateData.budget = Number(budget);
      }
      
      await updateDoc(doc(db, "groups", groupId), updateData);
      
      toast.success("Group updated successfully!");
      navigate(`/group/${groupId}`);
      
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDelete = async () => {
    if (group.createdBy !== user.uid) {
      toast.error("Only the group creator can delete the group");
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Delete all group transactions
      const transactionsQuery = query(
        collection(db, "groupTransactions"),
        where("groupId", "==", groupId)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      const deleteTransactionPromises = transactionsSnapshot.docs.map(
        (transactionDoc) => deleteDoc(doc(db, "groupTransactions", transactionDoc.id))
      );
      
      await Promise.all(deleteTransactionPromises);
      
      // Delete the group
      await deleteDoc(doc(db, "groups", groupId));
      
      toast.success("Group deleted successfully!");
      navigate("/groups");
      
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };
  
  const handleLeaveGroup = async () => {
    try {
      setIsDeleting(true);
      
      // Check if user is the creator and there are other members
      if (group.createdBy === user.uid && group.members.length > 1) {
        // Find another member to transfer ownership to
        const newOwner = group.members.find(id => id !== user.uid);
        
        // Update group ownership
        await updateDoc(doc(db, "groups", groupId), {
          createdBy: newOwner,
          members: arrayRemove(user.uid)
        });
        
        toast.success("You left the group and transferred ownership");
      } else {
        // Regular member leaving
        await updateDoc(doc(db, "groups", groupId), {
          members: arrayRemove(user.uid)
        });
        
        toast.success("You have left the group");
      }
      
      navigate("/groups");
      
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowLeaveConfirm(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (accessDenied) {
    return (
      <div className="text-center py-8">
        <h2 className="heading-lg text-red-500 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">You do not have permission to manage this group.</p>
        <button 
          onClick={() => navigate("/groups")} 
          className="btn btn-primary"
        >
          Back to Groups
        </button>
      </div>
    );
  }
  
  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Group not found</p>
      </div>
    );
  }
  
  const isAdmin = group.createdBy === user.uid;
  
  const currencySymbols = {
    USD: { symbol: "$", icon: <FaDollarSign /> },
    EUR: { symbol: "€", icon: <FaEuroSign /> },
    GBP: { symbol: "£", icon: <FaPoundSign /> },
    JPY: { symbol: "¥", icon: <FaYenSign /> },
  };
  
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(`/group/${groupId}`)} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <h1 className="heading-lg">Group Settings</h1>
      </div>
      
      <div className="card mb-6">
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
              Change group image
            </span>
          </div>
          
          {/* Group name */}
          <div>
            <label className="form-label">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          {/* Currency selection */}
          <div>
            <label className="form-label">
              Currency
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(currencySymbols).map(([code, { symbol, icon }]) => (
                <div
                  key={code}
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer ${
                    currency === code 
                    ? "border-primary bg-primary-light" 
                    : "border-gray-300 dark:border-gray-700"
                  }`}
                  onClick={() => setCurrency(code)}
                >
                  <span className={`text-xl ${
                    currency === code ? "text-primary" : "text-gray-500 dark:text-gray-400"
                  }`}>
                    {icon}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Budget amount (only for budget type) */}
          {group.type === "budget" && (
            <div>
              <label className="form-label">
                Group Budget
              </label>
              <div className="flex">
                <div className="flex items-center justify-center px-4 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg">
                  <span className="text-gray-700 dark:text-gray-300">
                    {currencySymbols[currency]?.symbol || "$"}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="Enter budget amount"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="form-input rounded-l-none w-full"
                  required={group.type === "budget"}
                />
              </div>
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isUpdating}
          >
            {isUpdating ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>
      </div>
      
      {/* Danger zone */}
      <div className="card">
        <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 text-red-500 font-semibold">Danger Zone</h2>
        
        <div className="p-4">
          {isAdmin ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="btn btn-danger w-full flex items-center justify-center"
              disabled={isDeleting}
            >
              <FaTrash className="mr-2" />
              {isDeleting ? "Deleting Group..." : "Delete Group"}
            </button>
          ) : (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="btn btn-danger w-full flex items-center justify-center"
              disabled={isDeleting}
            >
              <FaSignOutAlt className="mr-2" />
              {isDeleting ? "Leaving Group..." : "Leave Group"}
            </button>
          )}
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="heading-md mb-4">Delete Group?</h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. All group data, including transactions, will be permanently deleted.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave group confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="heading-md mb-4">Leave Group?</h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to leave this group? You'll need an invitation to rejoin.
              {isAdmin && group.members.length > 1 && 
                " As the group creator, ownership will be transferred to another member."}
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGroup}
                className="btn btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? "Leaving..." : "Leave Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;