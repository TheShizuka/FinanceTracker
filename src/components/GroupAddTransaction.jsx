// src/components/GroupAddTransaction.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { 
  collection, addDoc, doc, getDoc, updateDoc, 
  serverTimestamp, increment, getDocs, query, where
} from "firebase/firestore";
import { toast } from "react-toastify";
import { 
  FaUtensils, FaShoppingBag, FaCar, FaHome, FaGamepad, 
  FaBolt, FaMoneyBill, FaChevronDown, FaArrowLeft, FaUsers
} from "react-icons/fa";
import { getCurrencySymbol } from "../utils/currencyUtils";

// Category icon mapping
const categories = [
  { id: "food", name: "Food & Drinks", icon: <FaUtensils size={18} />, color: "bg-amber-100 dark:bg-amber-900 text-amber-500" },
  { id: "shopping", name: "Shopping", icon: <FaShoppingBag size={18} />, color: "bg-blue-100 dark:bg-blue-900 text-blue-500" },
  { id: "transport", name: "Transport", icon: <FaCar size={18} />, color: "bg-green-100 dark:bg-green-900 text-green-500" },
  { id: "housing", name: "Housing", icon: <FaHome size={18} />, color: "bg-purple-100 dark:bg-purple-900 text-purple-500" },
  { id: "entertainment", name: "Entertainment", icon: <FaGamepad size={18} />, color: "bg-pink-100 dark:bg-pink-900 text-pink-500" },
  { id: "utilities", name: "Utilities", icon: <FaBolt size={18} />, color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-500" },
  { id: "other", name: "Other", icon: <FaMoneyBill size={18} />, color: "bg-gray-100 dark:bg-gray-700 text-gray-500" },
];

const GroupAddTransaction = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const docSnap = await getDoc(doc(db, "groups", groupId));
        if (docSnap.exists()) {
          setGroup({ id: docSnap.id, ...docSnap.data() });
          
          // Fetch member details
          const memberPromises = docSnap.data().members.map(async (memberId) => {
            const memberDoc = await getDoc(doc(db, "users", memberId));
            if (memberDoc.exists()) {
              return { id: memberDoc.id, ...memberDoc.data() };
            }
            return { id: memberId, displayName: "Unknown User" };
          });
          
          const memberData = await Promise.all(memberPromises);
          setMembers(memberData);
        } else {
          toast.error("Group not found");
          navigate("/groups");
        }
      } catch (error) {
        console.error("Error fetching group:", error);
        toast.error("Error loading group details");
      }
    };
    
    fetchGroup();
  }, [groupId, navigate]);
  
  // When members are loaded, select all members except current user
  useEffect(() => {
    if (members.length > 0 && group?.type === "split") {
      const otherMembers = members
        .filter(member => member.id !== user.uid)
        .map(member => member.id);
      
      setSelectedMembers(otherMembers);
    }
  }, [members, group, user.uid]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Always store as negative number since we only allow expenses
      const finalAmount = -Math.abs(Number(amount));
      
      // Create transaction object
      const transactionData = {
        groupId,
        userId: user.uid,
        amount: finalAmount,
        category: selectedCategory,
        description,
        date,
        createdAt: serverTimestamp(),
      };
      
      // Add split information for split expense groups
      if (group.type === "split" && selectedMembers.length > 0) {
        transactionData.splitWith = selectedMembers;
      }
      
      // Add transaction to Firestore
      await addDoc(collection(db, "groupTransactions"), transactionData);
      
      // For budget groups, update the spent amount
      if (group.type === "budget") {
        await updateDoc(doc(db, "groups", groupId), {
          spent: increment(Math.abs(Number(amount)))
        });
      }
      
      toast.success("Expense added successfully!");
      navigate(`/group/${groupId}`);
      
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add expense: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleMember = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };
  
  const selectAllMembers = () => {
    const otherMembers = members
      .filter(member => member.id !== user.uid)
      .map(member => member.id);
    
    setSelectedMembers(otherMembers);
  };
  
  const clearSelectedMembers = () => {
    setSelectedMembers([]);
  };
  
  if (!group || !members.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const currencySymbol = getCurrencySymbol(group.currency || "USD");
  const selectedCategoryObj = categories.find(cat => cat.id === selectedCategory) || categories[0];
  
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
        <h1 className="heading-lg">Add Group Expense</h1>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5 p-4">
          {/* Amount */}
          <div className="card p-6">
            <label htmlFor="amount" className="form-label">Amount</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-lg">{currencySymbol}</span>
              </div>
              <input
                type="number"
                id="amount"
                placeholder="0.00"
                className="form-input pl-10 text-2xl py-4 text-center"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
          
          {/* Category selection */}
          <div className="card p-4">
            <label className="form-label">Category</label>
            
            {!showCategorySelect ? (
              <button
                type="button"
                onClick={() => setShowCategorySelect(true)}
                className="mt-1 w-full p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600"
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full ${selectedCategoryObj.color} flex items-center justify-center mr-3`}>
                    {selectedCategoryObj.icon}
                  </div>
                  <span>{selectedCategoryObj.name}</span>
                </div>
                <FaChevronDown className="text-gray-400" />
              </button>
            ) : (
              <div className="mt-2 space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setShowCategorySelect(false);
                      }}
                      className={`p-3 flex flex-col items-center rounded-lg transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-primary-light/10 border-2 border-primary"
                          : "hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full ${cat.color} flex items-center justify-center mb-1`}>
                        {cat.icon}
                      </div>
                      <span className="text-xs text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="card p-4">
            <label htmlFor="description" className="form-label">Description</label>
            <input
              type="text"
              id="description"
              placeholder="What's this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          {/* Date */}
          <div className="card p-4">
            <label htmlFor="date" className="form-label">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          {/* Split with (only for split expense groups) */}
          {group.type === "split" && (
            <div className="card p-4">
              <label className="form-label">
                Split With
              </label>
              
              <div 
                className="form-input flex justify-between items-center cursor-pointer"
                onClick={() => setShowMemberSelector(!showMemberSelector)}
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {selectedMembers.length === 0 
                    ? "Select members" 
                    : `${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''} selected`}
                </span>
                <FaChevronDown className={`text-gray-500 transition-transform ${showMemberSelector ? 'transform rotate-180' : ''}`} />
              </div>
              
              {showMemberSelector && (
                <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 flex justify-between">
                    <button 
                      type="button" 
                      onClick={selectAllMembers}
                      className="text-primary text-sm font-medium"
                    >
                      Select All
                    </button>
                    <button 
                      type="button" 
                      onClick={clearSelectedMembers}
                      className="text-red-500 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    {members
                      .filter(member => member.id !== user.uid)
                      .map(member => (
                        <div 
                          key={member.id} 
                          className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
                          onClick={() => toggleMember(member.id)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden mr-3">
                            {member.photoURL ? (
                              <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium">
                                {member.displayName?.charAt(0) || "U"}
                              </span>
                            )}
                          </div>
                          <span className="flex-1">{member.displayName}</span>
                          <div className="w-5 h-5 border border-gray-300 dark:border-gray-500 rounded flex items-center justify-center">
                            {selectedMembers.includes(member.id) && (
                              <div className="w-3 h-3 bg-primary rounded-sm"></div>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-danger w-full"
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupAddTransaction;