// src/pages/Stats.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { FaArrowLeft, FaChartPie, FaChartBar, FaChartLine } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO, isSameMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import RollingNumber from "../components/RollingNumber";

// Import chart components
import SpendingPieChart from "../components/SpendingPieChart";
import MonthlyBarChart from "../components/MonthlyBarChart";
import SpendingLineChart from "../components/SpendingLineChart";

const timeRangeOptions = [
  { value: "month", label: "Month" },
  { value: "3month", label: "3 Months" },
  { value: "6month", label: "6 Months" },
  { value: "year", label: "Year" },
  { value: "all", label: "All Time" },
];

const Stats = () => {
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  
  // Try to get the selected budget ID from location state
  const passedBudgetId = location.state?.selectedBudgetId || "";
  
  // Initial state uses the passed ID if available
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  
  const [timeRange, setTimeRange] = useState("month"); // Default to monthly view
  const [activeChart, setActiveChart] = useState("pie");
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate();

  // Fetch budgets for user
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const unsubBudgets = onSnapshot(
      query(collection(db, "budgets"), where("userId", "==", user.uid)),
      (snapshot) => {
        const b = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setBudgets(b);
        
        if (b.length > 0) {
          if (passedBudgetId && b.some(budget => budget.id === passedBudgetId)) {
            // If we have a valid passed budget ID, use it
            setSelectedBudgetId(passedBudgetId);
          } else if (!selectedBudgetId || !b.some(budget => budget.id === selectedBudgetId)) {
            // Otherwise, default to the first budget
            setSelectedBudgetId(b[0].id);
          }
        }
        
        if (b.length === 0) {
          setLoading(false);
        }
      }
    );
    
    return () => unsubBudgets();
  }, [user, passedBudgetId]);

  // Fetch transactions for selected budget
  useEffect(() => {
    if (!user || !selectedBudgetId) return;
    
    const qTx = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("budgetId", "==", selectedBudgetId),
      orderBy("date", "asc")
    );
    
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const tx = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransactions(tx);
      setLoading(false);
    });
    
    return () => unsubTx();
  }, [user, selectedBudgetId]);

  // Filter transactions based on selected time range
  useEffect(() => {
    if (transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }
    
    // If "all" is selected, include all transactions
    if (timeRange === "all") {
      setFilteredTransactions(transactions);
      return;
    }
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case "month":
        startDate = startOfMonth(now);
        break;
      case "3month":
        startDate = subMonths(now, 3);
        break;
      case "6month":
        startDate = subMonths(now, 6);
        break;
      case "year":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = startOfMonth(now);
    }
    
    const filtered = transactions.filter(tx => {
      const txDate = parseISO(tx.date);
      
      if (timeRange === "month") {
        // Special case for monthly filter to include current month only
        return isSameMonth(txDate, now);
      }
      
      return txDate >= startDate && txDate <= now;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, timeRange]);

  // Calculate totals
  const income = filteredTransactions
    .filter(tx => Number(tx.amount) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
  const expenses = filteredTransactions
    .filter(tx => Number(tx.amount) < 0)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    
  const balance = income - expenses;
  
  // Format currency
  const formatCurrency = (amount) => {
    const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
    const currency = selectedBudget?.currency || "EUR";
    
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Navigate back with budget context
  const navigateBack = () => {
    // Find the index of the selected budget to send back
    const selectedIndex = budgets.findIndex(b => b.id === selectedBudgetId);
    
    navigate("/", { 
      state: { 
        selectedBudgetId: selectedBudgetId,
        selectedBudgetIndex: selectedIndex >= 0 ? selectedIndex : 0
      } 
    });
  };

  if (loading) {
    // Show create budget button if no budgets exist
    if (budgets.length === 0) {
      return (
        <div className="max-w-lg mx-auto animate-fadeIn">
          <div className="mb-6 flex items-center">
          <button 
            onClick={() => navigate("/")} 
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
            aria-label="Go to home"
          >
            <FaArrowLeft />
          </button>

            <h1 className="heading-lg">Financial Stats</h1>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 text-center"
          >
            <p className="text-gray-500 dark:text-gray-400 mb-4">You need to create a budget first</p>
            <motion.button 
              onClick={() => navigate("/add-budget")}
              className="btn btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Your First Budget
            </motion.button>
          </motion.div>
        </div>
      );
    }
    
    // Show animated spinner for normal loading
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div 
          className="h-12 w-12 border-t-2 border-b-2 border-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fadeIn">
      <motion.div 
        className="mb-6 flex items-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={navigateBack} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go to home"
        >
          <FaArrowLeft />
        </button>
        <h1 className="heading-lg">Financial Stats</h1>
      </motion.div>
      
      <motion.div 
        className="grid grid-cols-1 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Filters */}
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget" className="form-label">Budget</label>
              <select
                id="budget"
                className="form-input mt-1"
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
              >
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.currency})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="timeRange" className="form-label">Time Range</label>
              <select
                id="timeRange"
                className="form-input mt-1"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div 
            className="card p-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Income</p>
            <p className="text-xl font-bold text-green-500 stats-value">
              <RollingNumber value={income} formatter={formatCurrency} />
            </p>
          </motion.div>
          
          <motion.div 
            className="card p-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expenses</p>
            <p className="text-xl font-bold text-red-500 stats-value">
              <RollingNumber value={expenses} formatter={formatCurrency} />
            </p>
          </motion.div>
          
          <motion.div 
            className="card p-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</p>
            <p className={`text-xl font-bold stats-value ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <RollingNumber value={balance} formatter={formatCurrency} />
            </p>
          </motion.div>
        </div>
        
        {/* Chart type selector */}
        <motion.div 
          className="card p-2 overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex justify-center min-w-max">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
              <motion.button
                onClick={() => setActiveChart("pie")}
                className={`px-4 py-2 rounded-md flex items-center ${
                  activeChart === "pie" 
                    ? "bg-white dark:bg-gray-700 shadow-sm" 
                    : "text-gray-700 dark:text-gray-300"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaChartPie className="mr-2" />
                Categories
              </motion.button>
              
              <motion.button
                onClick={() => setActiveChart("bar")}
                className={`px-4 py-2 rounded-md flex items-center ${
                  activeChart === "bar" 
                    ? "bg-white dark:bg-gray-700 shadow-sm" 
                    : "text-gray-700 dark:text-gray-300"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaChartBar className="mr-2" />
                Monthly
              </motion.button>
              
              <motion.button
                onClick={() => setActiveChart("line")}
                className={`px-4 py-2 rounded-md flex items-center ${
                  activeChart === "line" 
                    ? "bg-white dark:bg-gray-700 shadow-sm" 
                    : "text-gray-700 dark:text-gray-300"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaChartLine className="mr-2" />
                Trends
              </motion.button>
            </div>
          </div>
        </motion.div>
        
        {/* Chart display */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeChart}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="card p-6"
          >
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions available for this period</p>
                <motion.button
                  onClick={() => navigate("/add-transaction", { state: { selectedBudgetId } })}
                  className="btn btn-primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Add Transaction
                </motion.button>
              </div>
            ) : (
              <>
                {activeChart === "pie" && (
                  <div className="mb-2">
                    <h3 className="heading-sm text-center mb-4">Spending by Category</h3>
                    <SpendingPieChart transactions={filteredTransactions} />
                  </div>
                )}
                
                {activeChart === "bar" && (
                  <div className="mb-2">
                    <h3 className="heading-sm text-center mb-4">Income vs. Expenses by Month</h3>
                    <MonthlyBarChart transactions={filteredTransactions} />
                  </div>
                )}
                
                {activeChart === "line" && (
                  <div className="mb-2">
                    <h3 className="heading-sm text-center mb-4">Spending Trends</h3>
                    <SpendingLineChart transactions={filteredTransactions} />
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Insights with fixed alignment */}
        {filteredTransactions.length > 0 && (
          <motion.div 
            className="card p-4 bg-primary-light/10 border border-primary-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="heading-sm mb-2 text-left">Insights</h3>
            <ul className="space-y-3 text-sm">
              {expenses > income && (
                <motion.li 
                  className="flex items-start"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    Your expenses exceed your income in this period. Consider reviewing your spending habits.
                  </div>
                </motion.li>
              )}
              
              {filteredTransactions.length > 0 && (
                <motion.li 
                  className="flex items-start"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    Your top spending category is{" "}
                    {(() => {
                      const categories = {};
                      filteredTransactions.forEach(tx => {
                        if (Number(tx.amount) < 0) {
                          categories[tx.category] = (categories[tx.category] || 0) + Math.abs(Number(tx.amount));
                        }
                      });
                      
                      const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
                      return topCategory ? <strong className="capitalize">{topCategory[0]}</strong> : "not available";
                    })()}
                  </div>
                </motion.li>
              )}
            </ul>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Stats;