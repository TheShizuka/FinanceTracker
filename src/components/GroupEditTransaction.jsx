// src/components/GroupEditTransaction.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { 
  doc, getDoc, updateDoc, increment, 
  collection, query, where, getDocs 
} from "firebase/firestore";
import { toast } from "react-toastify";
import { FaChevronDown, FaArrowLeft } from "react-icons/fa";
import { getCurrencySymbol } from "../utils/currencyUtils";

const GroupEditTransaction = () => {
  const { groupId, transactionId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [transaction, setTransaction] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Define categories
  const categories = [
    "food", "transportation", "accommodation", "entertainment", 
    "shopping", "utilities", "medical", "general", "other"
  ];
  
  // Fetch transaction data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get transaction
        const transactionDoc = await getDoc(doc(db, "groupTransactions", transactionId));
        if (!transactionDoc.exists()) {
          toast.error("Transaction not found");
          navigate(`/group/${groupId}`);
          return;
        }
        
        const transactionData = { id: transactionDoc.id, ...transactionDoc.data() };
        
        // Check if current user is the one who created the transaction
        if (transactionData.userId !== user.uid) {
          toast.error("You can only edit your own transactions");
          navigate(`/group/${groupId}`);
          return;
        }
        
        setTransaction(transactionData);
        setAmount(Math.abs(Number(transactionData.amount)).toString());
        setCategory(transactionData.category || "general");
        setDescription(transactionData.description || "");
        setDate(transactionData.date || "");
        setSelectedMembers(transactionData.splitWith || []);
        
        // Get group
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (!groupDoc.exists()) {
          toast.error("Group not found");
          navigate("/groups");
          return;
        }
        
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        setGroup(groupData);
        
        // Fetch member details
        const memberPromises = groupData.members.map(async (memberId) => {
          const memberDoc = await getDoc(doc(db, "users", memberId));
          if (memberDoc.exists()) {
            return { id: memberDoc.id, ...memberDoc.data() };
          }
          return { id: memberId, displayName: "Unknown User" };
        });
        
        const memberData = await Promise.all(memberPromises);
        setMembers(memberData);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error loading data");
        navigate(`/group/${groupId}`);
      }
    };
    
    fetchData();
  }, [groupId, transactionId, navigate, user.uid]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Always a negative amount since we can only edit expenses
      const finalAmount = -Math.abs(Number(amount));
      
      // Calculate the difference to update group budget
      const amountDiff = finalAmount - transaction.amount;
      
      // Update transaction object
      const transactionData = {
        amount: finalAmount,
        category,
        description,
        date,
      };
      
      // For split expenses, add the splitWith field
      if (group.type === "split" && selectedMembers.length > 0) {
        transactionData.splitWith = selectedMembers;
      }
      
      // Update transaction in Firestore
      await updateDoc(doc(db, "groupTransactions", transactionId), transactionData);
      
      // For budget groups, update the spent amount based on the difference
      if (group.type === "budget" && amountDiff !== 0) {
        await updateDoc(doc(db, "groups", groupId), {
          spent: increment(Math.abs(amountDiff))
        });
      }
      
      toast.success("Transaction updated successfully!");
      navigate(`/group/${groupId}`);
      
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction: " + error.message);
    } finally {
      setIsUpdating(false);
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!transaction || !group) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Transaction not found</p>
      </div>
    );
  }
  
  const currencySymbol = getCurrencySymbol(group.currency || "USD");
  
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
        <h1 className="heading-lg">Edit Expense</h1>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5 p-4">
          {/* Amount */}
          <div>
            <label className="form-label">
              Amount
            </label>
            <div className="flex">
              <div className="flex items-center justify-center px-4 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg">
                <span className="text-gray-700 dark:text-gray-300">{currencySymbol}</span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input rounded-l-none w-full"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label className="form-label">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select">
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Description */}
          <div>
            <label className="form-label">
              Description
            </label>
            <input
              type="text"
              placeholder="What's this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              maxLength={100}
              required
            />
          </div>
          
          {/* Date */}
          <div>
            <label className="form-label">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          {/* Split with (only for split expense groups) */}
          {group.type === "split" && (
            <div>
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
            className="btn btn-primary w-full"
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Update Expense"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupEditTransaction;