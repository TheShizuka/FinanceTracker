// src/pages/AddTransaction.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { 
  FaArrowLeft, 
  FaUtensils, 
  FaShoppingBag, 
  FaCar, 
  FaHome as FaHomeIcon, 
  FaGamepad, 
  FaBolt, 
  FaPlus, 
  FaTimes,
  FaMoneyBill,
  FaDollarSign,
  FaBriefcase,
  FaGift,
  FaExchangeAlt,
  FaUniversity,
  FaPlane,
  FaMedkit,
  FaGraduationCap,
  FaPizzaSlice,
  FaCoffee,
  FaStore
} from "react-icons/fa";

const categories = [
  // Expense categories
  { id: "food", name: "Food & Drinks", icon: <FaUtensils size={18} />, color: "bg-amber-100 dark:bg-amber-900 text-amber-500", type: "expense" },
  { id: "restaurant", name: "Restaurant", icon: <FaPizzaSlice size={18} />, color: "bg-orange-100 dark:bg-orange-900 text-orange-500", type: "expense" },
  { id: "coffee", name: "Coffee & Snacks", icon: <FaCoffee size={18} />, color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600", type: "expense" },
  { id: "groceries", name: "Groceries", icon: <FaStore size={18} />, color: "bg-lime-100 dark:bg-lime-900 text-lime-600", type: "expense" },
  { id: "shopping", name: "Shopping", icon: <FaShoppingBag size={18} />, color: "bg-blue-100 dark:bg-blue-900 text-blue-500", type: "expense" },
  { id: "transport", name: "Transport", icon: <FaCar size={18} />, color: "bg-green-100 dark:bg-green-900 text-green-500", type: "expense" },
  { id: "housing", name: "Housing", icon: <FaHomeIcon size={18} />, color: "bg-purple-100 dark:bg-purple-900 text-purple-500", type: "expense" },
  { id: "entertainment", name: "Entertainment", icon: <FaGamepad size={18} />, color: "bg-pink-100 dark:bg-pink-900 text-pink-500", type: "expense" },
  { id: "utilities", name: "Utilities", icon: <FaBolt size={18} />, color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-500", type: "expense" },
  { id: "travel", name: "Travel", icon: <FaPlane size={18} />, color: "bg-indigo-100 dark:bg-indigo-900 text-indigo-500", type: "expense" },
  { id: "medical", name: "Medical", icon: <FaMedkit size={18} />, color: "bg-red-100 dark:bg-red-900 text-red-500", type: "expense" },
  { id: "education", name: "Education", icon: <FaGraduationCap size={18} />, color: "bg-blue-100 dark:bg-blue-900 text-blue-600", type: "expense" },
  
  // Income categories
  { id: "salary", name: "Salary", icon: <FaBriefcase size={18} />, color: "bg-green-100 dark:bg-green-900 text-green-600", type: "income" },
  { id: "investment", name: "Investment", icon: <FaDollarSign size={18} />, color: "bg-emerald-100 dark:bg-emerald-900 text-emerald-600", type: "income" },
  { id: "gift", name: "Gift", icon: <FaGift size={18} />, color: "bg-pink-100 dark:bg-pink-900 text-pink-600", type: "income" },
  { id: "refund", name: "Refund", icon: <FaExchangeAlt size={18} />, color: "bg-cyan-100 dark:bg-cyan-900 text-cyan-600", type: "income" },
  { id: "freelance", name: "Freelance", icon: <FaBriefcase size={18} />, color: "bg-teal-100 dark:bg-teal-900 text-teal-600", type: "income" },
  { id: "passive", name: "Passive Income", icon: <FaUniversity size={18} />, color: "bg-lime-100 dark:bg-lime-900 text-lime-600", type: "income" },
  
  // Both types
  { id: "other", name: "Other", icon: <FaMoneyBill size={18} />, color: "bg-gray-100 dark:bg-gray-700 text-gray-500", type: "both" },
];

const AddTransaction = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  // Check if we're editing an existing transaction
  const editingTransaction = location.state?.transaction || null;
  
  // Get budget ID and return index from navigation state
  const passedBudgetId = location.state?.selectedBudgetId || "";
  const returnToIndex = location.state?.returnToIndex !== undefined ? location.state?.returnToIndex : 0;
  
  // Check if we have a default isIncome value passed from navigation
  const defaultIsIncome = editingTransaction 
    ? Number(editingTransaction.amount) > 0 
    : (location.state?.isIncome !== undefined ? location.state.isIncome : false);

  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(editingTransaction?.budgetId || passedBudgetId);
  const [date, setDate] = useState(editingTransaction?.date || new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState(editingTransaction?.category || "food");
  const [amount, setAmount] = useState(editingTransaction ? Math.abs(Number(editingTransaction.amount)).toString() : "");
  const [isPositive, setIsPositive] = useState(defaultIsIncome);
  const [notes, setNotes] = useState(editingTransaction?.notes || "");
  const [loading, setLoading] = useState(false);
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  
  // Filter categories based on transaction type
  const filteredCategories = categories.filter(cat => 
    cat.type === "both" || 
    (isPositive && cat.type === "income") || 
    (!isPositive && cat.type === "expense")
  );

  useEffect(() => {
    if (!user) return;
    
    const qBudgets = query(collection(db, "budgets"), where("userId", "==", user.uid));
    const unsub = onSnapshot(qBudgets, (snapshot) => {
      const userBudgets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBudgets(userBudgets);
      
      // Only set default budget if one wasn't already passed and we have budgets
      if (userBudgets.length > 0 && !selectedBudgetId) {
        setSelectedBudgetId(userBudgets[0].id);
      }
    });
    
    return () => unsub();
  }, [user, selectedBudgetId]);

  // Switch category when changing transaction type
  useEffect(() => {
    // Check if current category matches transaction type
    const currentCategoryObj = categories.find(cat => cat.id === category);
    
    if (currentCategoryObj && currentCategoryObj.type !== "both") {
      if (isPositive && currentCategoryObj.type !== "income") {
        // Set default income category
        setCategory("salary");
      } else if (!isPositive && currentCategoryObj.type !== "expense") {
        // Set default expense category
        setCategory("food");
      }
    }
  }, [isPositive, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !selectedBudgetId) {
      toast.error("Please select a budget");
      return;
    }
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    // Validate minimum transaction amount to prevent very small values
    if (Number(amount) < 1) {
      toast.error("Minimum transaction amount is 1");
      return;
    }
    
    setLoading(true);
    
    try {
      const finalAmount = isPositive ? Number(amount) : -Number(amount);
      
      // Data to save
      const transactionData = {
        userId: user.uid,
        budgetId: selectedBudgetId,
        date,
        category,
        amount: finalAmount,
        notes: notes.trim(),
      };
      
      if (editingTransaction) {
        // Update existing transaction
        const docRef = doc(db, "transactions", editingTransaction.id);
        
        // Add updatedAt timestamp
        transactionData.updatedAt = new Date();
        
        await updateDoc(docRef, transactionData);
        toast.success("Transaction updated!");
      } else {
        // Create new transaction
        transactionData.createdAt = new Date();
        
        await addDoc(collection(db, "transactions"), transactionData);
        toast.success("Transaction added!");
      }
      
      // Navigate back to home with the saved budget index
      navigate("/", { state: { selectedBudgetIndex: returnToIndex } });
    } catch (error) {
      console.error(error);
      toast.error("Error saving transaction: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryObj = categories.find(cat => cat.id === category) || filteredCategories[0];

  return (
    <div className="max-w-md mx-auto animate-fadeIn">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => navigate("/", { state: { selectedBudgetIndex: returnToIndex } })} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go to home"
        >
          <FaArrowLeft />
        </button>
        <h1 className="heading-lg">{editingTransaction ? "Edit" : "Add"} Transaction</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction type toggle */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
            <button
              type="button"
              onClick={() => setIsPositive(false)}
              className={`px-4 py-2 rounded-md font-medium ${
                !isPositive 
                  ? "bg-red-500 text-white" 
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setIsPositive(true)}
              className={`px-4 py-2 rounded-md font-medium ${
                isPositive 
                  ? "bg-green-500 text-white" 
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              Income
            </button>
          </div>
        </div>
        
        {/* Amount input */}
        <div className="card p-6">
          <label htmlFor="amount" className="form-label">Amount</label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-lg">
                {budgets.length > 0 && selectedBudgetId
                  ? budgets.find(b => b.id === selectedBudgetId)?.currency || "€"
                  : "€"}
              </span>
            </div>
            <input
              type="number"
              id="amount"
              placeholder="0.00"
              className="form-input pl-10 text-2xl py-4 text-center"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="1"  // Set minimum to 1
              required
            />
          </div>
        </div>
        
        {/* Budget selection */}
        <div className="card p-4">
          <label htmlFor="budget" className="form-label">Budget</label>
          <select
            id="budget"
            className="form-input mt-1"
            value={selectedBudgetId}
            onChange={(e) => setSelectedBudgetId(e.target.value)}
            required
          >
            {budgets.length === 0 ? (
              <option value="">No budgets available</option>
            ) : (
              budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currency})
                </option>
              ))
            )}
          </select>
          
          {budgets.length === 0 && (
            <button
              type="button"
              onClick={() => navigate("/add-budget")}
              className="mt-2 text-primary hover:text-primary-dark text-sm"
            >
              Create a budget first
            </button>
          )}
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
              <FaPlus className="text-gray-400" />
            </button>
          ) : (
            <div className="mt-2 space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Select Category</h3>
                <button
                  type="button"
                  onClick={() => setShowCategorySelect(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      setShowCategorySelect(false);
                    }}
                    className={`p-3 flex flex-col items-center rounded-lg transition-colors ${
                      category === cat.id
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
        
        {/* Date selection */}
        <div className="card p-4">
          <label htmlFor="date" className="form-label">Date</label>
          <input
            type="date"
            id="date"
            className="form-input mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        
        {/* Notes */}
        <div className="card p-4">
          <label htmlFor="notes" className="form-label">Notes (optional)</label>
          <textarea
            id="notes"
            placeholder="Add description..."
            className="form-input mt-1 min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        
        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !selectedBudgetId}
          className={`btn w-full ${
            isPositive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
          } text-white font-medium py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPositive ? "focus:ring-green-500" : "focus:ring-red-500"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            `Save ${isPositive ? "Income" : "Expense"}`
          )}
        </button>
      </form>
    </div>
  );
};

export default AddTransaction;