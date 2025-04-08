// src/pages/AddBudget.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { FaArrowLeft, FaWallet } from "react-icons/fa";
import { motion } from "framer-motion";

const AddBudget = () => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "CAD", symbol: "$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "$", name: "Australian Dollar" },
    { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "RUB", symbol: "₽", name: "Russian Ruble" },
    { code: "KRW", symbol: "₩", name: "South Korean Won" },
    { code: "MXN", symbol: "$", name: "Mexican Peso" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a budget name");
      return;
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Please enter a valid starting amount");
      return;
    }

    setLoading(true);

    try {
      // Create budget in Firestore
      const budgetData = {
        name: name.trim(),
        amount: Number(amount),
        currency,
        userId: user.uid,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "budgets"), budgetData);
      
      // Add initial amount as a transaction
      if (Number(amount) > 0) {
        const transactionData = {
          amount: Number(amount),
          category: "initial",
          date: new Date().toISOString().split('T')[0],
          description: "Initial budget amount",
          budgetId: docRef.id,
          userId: user.uid,
          createdAt: new Date(),
        };
        await addDoc(collection(db, "transactions"), transactionData);
      }
      
      toast.success("Budget created successfully!");

      // Navigate back to home
      navigate("/");
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget: " + error.message);
    } finally {
      setLoading(false);
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

        <h1 className="heading-lg">Create New Budget</h1>
      </div>

      <motion.div 
        className="card p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">
              Budget Name
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaWallet className="text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                placeholder="e.g. My Monthly Budget"
                className="form-input pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="form-label">
              Starting Amount
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">{currencies.find(c => c.code === currency)?.symbol || currency}</span>
              </div>
              <input
                type="number"
                id="amount"
                placeholder="0.00"
                className="form-input pl-10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="currency" className="form-label">
              Currency
            </label>
            <select
              id="currency"
              className="form-input mt-1"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-3"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Budget...
              </div>
            ) : (
              "Create Budget"
            )}
          </button>
        </form>
      </motion.div>

      <motion.div 
        className="card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="heading-sm mb-3">What is a budget?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          A budget is a financial plan that helps you track income and expenses for a specific purpose or time period.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You can create multiple budgets for different purposes, such as monthly expenses, vacation savings, or project costs.
        </p>
      </motion.div>
    </div>
  );
};

export default AddBudget;