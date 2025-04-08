// src/components/EditTransaction.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { 
  doc, getDoc, updateDoc, 
  collection, query, where, getDocs 
} from "firebase/firestore";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

const EditTransaction = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [transaction, setTransaction] = useState(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Define categories
  const categories = [
    "food", "transportation", "accommodation", "entertainment", 
    "shopping", "utilities", "medical", "general", "other"
  ];
  
  // Fetch transaction data
  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const transactionDoc = await getDoc(doc(db, "transactions", transactionId));
        if (!transactionDoc.exists()) {
          toast.error("Transaction not found");
          navigate("/");
          return;
        }
        
        const transactionData = { id: transactionDoc.id, ...transactionDoc.data() };
        
        // Check if current user is the owner of this transaction
        if (transactionData.userId !== user.uid) {
          toast.error("You can only edit your own transactions");
          navigate("/");
          return;
        }
        
        setTransaction(transactionData);
        setAmount(Math.abs(Number(transactionData.amount)).toString());
        setCategory(transactionData.category || "general");
        setDescription(transactionData.description || "");
        setDate(transactionData.date || "");
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching transaction:", error);
        toast.error("Error loading transaction data");
        navigate("/");
      }
    };
    
    fetchTransaction();
  }, [transactionId, navigate, user.uid]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      setIsUpdating(true);
      
      // Determine if it's an expense or income based on original transaction
      const isExpense = transaction.amount < 0;
      const finalAmount = isExpense ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
      
      // Update transaction object
      const transactionData = {
        amount: finalAmount,
        category,
        description,
        date,
      };
      
      // Update transaction in Firestore
      await updateDoc(doc(db, "transactions", transactionId), transactionData);
      
      toast.success("Transaction updated successfully!");
      navigate("/transactions");
      
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!transaction) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Transaction not found</p>
      </div>
    );
  }
  
  const isExpense = transaction.amount < 0;
  
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate("/transactions")} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <h1 className="heading-lg">
          {isExpense ? "Edit Expense" : "Edit Income"}
        </h1>
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
                <span className="text-gray-700 dark:text-gray-300">$</span>
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
              className="form-select"
            >
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
          
          {/* Submit button */}
          <button
            type="submit"
            className={`btn w-full ${
              isExpense ? "btn-danger" : "btn-success"
            }`}
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Update Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditTransaction;