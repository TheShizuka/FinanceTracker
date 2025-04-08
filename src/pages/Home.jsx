// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, where, orderBy, limit, doc, deleteDoc } from "firebase/firestore";
import { 
  format, 
  startOfMonth, 
  startOfWeek, 
  endOfWeek, 
  endOfMonth, 
  parseISO, 
  isWithinInterval,
  isSameMonth 
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import RollingNumber from "../components/RollingNumber";
import AnimatedList from "../components/AnimatedList";
import AnimatedModal from "../components/AnimatedModal";
import { toast } from "react-toastify";
import { 
  FaPlus, 
  FaChevronLeft, 
  FaChevronRight, 
  FaArrowUp, 
  FaArrowDown,
  FaUtensils,
  FaShoppingBag,
  FaCar,
  FaHome as FaHomeIcon,
  FaGamepad,
  FaBolt,
  FaMoneyBill,
  FaTrash,
  FaCog,
  FaEllipsisV
} from "react-icons/fa";
import TransactionItem from "../components/TransactionItem";

// Category icon mapping
const getCategoryIcon = (category) => {
  const icons = {
    food: <FaUtensils className="text-amber-500" />,
    shopping: <FaShoppingBag className="text-blue-500" />,
    transport: <FaCar className="text-green-500" />,
    housing: <FaHomeIcon className="text-purple-500" />,
    entertainment: <FaGamepad className="text-pink-500" />,
    utilities: <FaBolt className="text-yellow-500" />,
    other: <FaMoneyBill className="text-gray-500" />
  };
  
  return icons[category?.toLowerCase()] || <FaMoneyBill className="text-gray-500" />;
};

// Format currency helper
const formatCurrency = (amount, currency = "EUR") => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
  });
  
  return formatter.format(amount);
};

const Home = () => {
  const location = useLocation();
  const [budgets, setBudgets] = useState([]);
  const [selectedBudgetIndex, setSelectedBudgetIndex] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [lastDirection, setLastDirection] = useState('right');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingBudget, setIsDeletingBudget] = useState(false);
  const [showBudgetMenu, setShowBudgetMenu] = useState(false);
  const [animationType, setAnimationType] = useState('horizontal'); // 'horizontal' or 'vertical'
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Handler for time filter changes - sets animation variant
  const handleTimeFilterChange = (filterId) => {
    // Only update if it's a change
    if (filterId !== timeFilter) {
      setAnimationType('vertical');
      setTimeFilter(filterId);
    }
  };

  // Available time filters
  const timeFilters = [
    { id: "all", label: "All Time" },
    { id: "month", label: "This Month" },
    { id: "week", label: "This Week" },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showBudgetMenu) setShowBudgetMenu(false);
    };

    // Add event listener when menu is open
    if (showBudgetMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showBudgetMenu]);

  // Update filtered transactions when time filter changes
  useEffect(() => {
    if (transactions.length > 0) {
      const filtered = getFilteredTransactions();
      setFilteredTransactions(filtered);
    }
  }, [timeFilter, transactions]);

  // Fetch budgets for user
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(collection(db, "budgets"), where("userId", "==", user.uid));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const bs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBudgets(bs);
      
      if (bs.length > 0) {
        // Check if we have a budgetId from location state
        if (location.state?.selectedBudgetId) {
          const budgetIndex = bs.findIndex(b => b.id === location.state.selectedBudgetId);
          if (budgetIndex !== -1) {
            setSelectedBudgetIndex(budgetIndex);
          }
        } else if (location.state?.selectedBudgetIndex !== undefined) {
          // Fallback to index if no id is provided
          if (location.state.selectedBudgetIndex < bs.length) {
            setSelectedBudgetIndex(location.state.selectedBudgetIndex);
          }
        }
      }
      
      setLoading(false);
    });
    
    return () => unsub();
  }, [user, location.state]);

  // Fetch transactions for selected budget
  useEffect(() => {
    if (!user || budgets.length === 0) return;
    
    const selectedBudget = budgets[selectedBudgetIndex];
    const qTx = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("budgetId", "==", selectedBudget.id),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc"),
    );
    
    const unsub = onSnapshot(qTx, (snapshot) => {
      const txs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          amount: Number(data.amount) // Ensure amount is a number for consistent calculations
        };
      });
      setTransactions(txs);
      
      // Calculate running balance for chart
      const sortedTxs = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      let balance = 0; // Start at 0 since initial amount is now a transaction
      const history = sortedTxs.map(tx => {
        balance += tx.amount;
        return {
          date: tx.date,
          balance
        };
      });
      
      // Add starting point
      history.unshift({
        date: sortedTxs.length > 0 ? sortedTxs[0].date : new Date().toISOString().split('T')[0],
        balance: 0
      });
      
      setBalanceHistory(history);
    });
    
    return () => unsub();
  }, [user, budgets, selectedBudgetIndex]);

  // Filter transactions based on selected time range
  useEffect(() => {
    if (transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }
    
    setFilteredTransactions(getFilteredTransactions());
  }, [transactions, timeFilter]);

  // Filter transactions based on selected time range
  const getFilteredTransactions = () => {
    const now = new Date();
    
    if (timeFilter === "all") {
      return transactions;
    } else if (timeFilter === "month") {
      // Using the same isSameMonth logic as in Stats.jsx
      return transactions.filter(tx => {
        try {
          const txDate = parseISO(tx.date);
          return isSameMonth(txDate, now);
        } catch (err) {
          return false;
        }
      });
    } else if (timeFilter === "week") {
      const startDate = startOfWeek(now, { weekStartsOn: 1 });
      const endDate = endOfWeek(now, { weekStartsOn: 1 });
      
      return transactions.filter(tx => {
        try {
          const txDate = parseISO(tx.date);
          return txDate >= startDate && txDate <= endDate;
        } catch (err) {
          return false;
        }
      });
    }
    
    return transactions;
  };

  // Calculate income and expenses for the filtered transactions
  const income = filteredTransactions
    .filter(tx => tx.amount > 0)
    .reduce((acc, tx) => acc + tx.amount, 0);
    
  const expenses = filteredTransactions
    .filter(tx => tx.amount < 0)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  // Compute current balance using filtered transactions (consistent with Stats.jsx)
  const currentBalance = income - expenses;

  const handlePrev = () => {
    if (budgets.length <= 1) return;
    setAnimationType('horizontal');
    setLastDirection('left');
    setSelectedBudgetIndex(prev => (prev === 0 ? budgets.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (budgets.length <= 1) return;
    setAnimationType('horizontal');
    setLastDirection('right');
    setSelectedBudgetIndex(prev => (prev === budgets.length - 1 ? 0 : prev + 1));
  };

  // Function to navigate to add transaction with current budget
  const navigateToAddTransaction = (isIncome) => {
    // Check if budgets exist first
    if (budgets.length === 0) {
      navigate("/add-budget");
      return;
    }
    
    const selectedBudget = budgets[selectedBudgetIndex];
    navigate("/add-transaction", { 
      state: { 
        isIncome, 
        selectedBudgetId: selectedBudget.id,
        returnToIndex: selectedBudgetIndex
      } 
    });
  };

  // Navigate to other pages with budget context
  const navigateWithBudget = (path) => {
    if (budgets.length === 0) return;
    
    const selectedBudget = budgets[selectedBudgetIndex];
    navigate(path, { 
      state: { 
        selectedBudgetId: selectedBudget.id,
        selectedBudgetIndex: selectedBudgetIndex
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  const selectedBudget = budgets[selectedBudgetIndex];
  
  // Handle budget deletion
  const handleDeleteBudget = async () => {
    if (!selectedBudget || !user) return;
    
    try {
      setIsDeletingBudget(true);
      
      // Delete all transactions for this budget
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("budgetId", "==", selectedBudget.id)
      );
      
      const unsubTx = onSnapshot(transactionsQuery, async (snapshot) => {
        // Unsubscribe immediately to prevent multiple deletion attempts
        unsubTx();
        
        // Delete all transactions
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Delete the budget
        await deleteDoc(doc(db, "budgets", selectedBudget.id));
        
        toast.success(`Budget "${selectedBudget.name}" has been deleted`);
        setShowDeleteModal(false);
      });
    } catch (error) {
      toast.error("Failed to delete budget: " + error.message);
    } finally {
      setIsDeletingBudget(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-lg mx-auto">
      {/* Welcome section */}
      <div className="mb-4">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="heading-lg mb-1"
        >
          Welcome back
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-600 dark:text-gray-400"
        >
          Track your finances with ease
        </motion.p>
      </div>
      
      {/* Budget card */}
      {budgets.length > 0 ? (
        <div className="relative">
          <AnimatePresence mode="wait" custom={{ direction: lastDirection, type: animationType }}>
            <motion.div 
              key={`${selectedBudgetIndex}-${timeFilter}-${filteredTransactions.length}`}
              custom={{ direction: lastDirection, type: animationType }}
              variants={{
                initial: (custom) => custom.type === 'horizontal' 
                  ? { 
                      opacity: 0, 
                      x: custom.direction === 'right' ? 40 : -40,
                      y: 0
                    }
                  : {
                      opacity: 0,
                      x: 0,
                      y: 20
                    },
                animate: { 
                  opacity: 1, 
                  x: 0,
                  y: 0
                },
                exit: (custom) => custom.type === 'horizontal'
                  ? { 
                      opacity: 0, 
                      x: custom.direction === 'right' ? -40 : 40,
                      y: 0
                    }
                  : {
                      opacity: 0,
                      x: 0,
                      y: -20
                    }
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="card p-6 overflow-visible"
            >
              {/* Budget header with name and menu button */}
              <div className="relative mb-4 flex justify-between items-center">
                <div className="w-8"></div> {/* Empty space for balance */}
                <h2 className="text-lg font-semibold text-center">{selectedBudget.name}</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBudgetMenu(!showBudgetMenu);
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  title="Budget options"
                >
                  <FaEllipsisV size={12} />
                </motion.button>
                
                {/* Budget menu dropdown */}
                {showBudgetMenu && (
                  <div 
                    className="absolute right-0 mt-8 top-0 bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-10 min-w-[140px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setShowBudgetMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FaTrash size={12} />
                      <span>Delete Budget</span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Current Balance with navigation arrows on the same line */}
              <div className="flex justify-between items-center mb-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrev} 
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  aria-label="Previous budget"
                >
                  <FaChevronLeft />
                </motion.button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Balance</p>
                  <p className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <RollingNumber 
                      key={`balance-${selectedBudgetIndex}-${timeFilter}-${filteredTransactions.reduce((acc, tx) => acc + tx.amount, 0).toFixed(2)}`}
                      value={currentBalance} 
                      formatter={(val) => formatCurrency(val, selectedBudget.currency)}
                      duration={1.2}
                    />
                  </p>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  aria-label="Next budget"
                >
                  <FaChevronRight />
                </motion.button>
              </div>
              
              {/* Time filter selector */}
              <div className="flex justify-center mt-4">
                <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {timeFilters.map(filter => (
                    <motion.button
                      key={filter.id}
                      onClick={() => handleTimeFilterChange(filter.id)}
                      className={`px-3 py-1 text-sm rounded-md transition ${
                        timeFilter === filter.id
                          ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {filter.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Income vs. Expenses */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-center mb-1">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                      <FaArrowUp className="text-green-500" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
                  <p className="text-lg font-semibold text-green-500">
                    <RollingNumber 
                      key={`income-${selectedBudgetIndex}-${timeFilter}-${income.toFixed(2)}`}
                      value={income} 
                      formatter={(val) => formatCurrency(val, selectedBudget.currency)}
                      duration={1.0}
                    />
                  </p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-center mb-1">
                      <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                        <FaArrowDown className="text-red-500" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expenses</p>
                    <p className="text-lg font-semibold text-red-500">
                      <RollingNumber 
                        key={`expenses-${selectedBudgetIndex}-${timeFilter}-${expenses.toFixed(2)}`}
                        value={expenses} 
                        formatter={(val) => formatCurrency(val, selectedBudget.currency)}
                        duration={1.0}
                      />
                    </p>
                  </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 text-center"
        >
          <p className="text-lg mb-4">You don't have any budgets yet</p>
          <motion.button 
            onClick={() => navigate("/add-budget")}
            className="btn btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Your First Budget
          </motion.button>
        </motion.div>
      )}
      
      {/* Quick actions */}
      <div className="flex justify-between gap-4 mb-4">
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigateToAddTransaction(true)}
          className="flex-1 card flex flex-col items-center p-4 transition hover:shadow-card-hover"
        >
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 mb-2">
            <FaPlus className="text-green-500" />
          </div>
          <span className="text-sm font-medium">Add Income</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigateToAddTransaction(false)}
          className="flex-1 card flex flex-col items-center p-4 transition hover:shadow-card-hover"
        >
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900 mb-2">
            <FaPlus className="text-red-500" />
          </div>
          <span className="text-sm font-medium">Add Expense</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigateWithBudget("/stats")}
          className="flex-1 card flex flex-col items-center p-4 transition hover:shadow-card-hover"
        >
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
          </div>
          <span className="text-sm font-medium">View Stats</span>
        </motion.button>
      </div>
      
      {/* Recent transactions */}
      <div>
        <motion.div 
          className="flex justify-between items-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="heading-md">Recent Transactions</h2>
          <motion.button
            whileHover={{ scale: 1.05, x: 2 }}
            onClick={() => navigateWithBudget("/transactions")}
            className="text-sm text-primary hover:text-primary-dark"
          >
            View All
          </motion.button>
        </motion.div>
        
        <motion.div 
          className="card divide-y divide-gray-100 dark:divide-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          key={`transactions-${timeFilter}-${filteredTransactions.length}`}
        >
          {filteredTransactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No transactions for this period</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateToAddTransaction(false)}
                className="mt-2 text-primary hover:text-primary-dark text-sm"
              >
                Add a transaction
              </motion.button>
            </div>
          ) : (
            <AnimatedList key={`transaction-list-${timeFilter}-${filteredTransactions.length}`}>
              {/* Only show the 3 most recent transactions */}
              {filteredTransactions.slice(0, 3).map((tx) => (
                <TransactionItem 
                  key={`${tx.id}-${timeFilter}`}
                  transaction={tx} 
                  budget={selectedBudget}
                  getCategoryIcon={getCategoryIcon}
                />
              ))}
            </AnimatedList>
          )}
        </motion.div>
      </div>
      
      {/* Delete Budget Confirmation Modal */}
      <AnimatedModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Budget"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete the budget "{selectedBudget?.name}"?</p>
          <p className="text-sm text-red-500">This will permanently delete this budget and all of its transactions. This action cannot be undone.</p>
          
          <div className="flex justify-end space-x-3 mt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeleteModal(false)}
              className="btn btn-outline"
              disabled={isDeletingBudget}
            >
              Cancel
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteBudget}
              className="btn btn-danger"
              disabled={isDeletingBudget}
            >
              {isDeletingBudget ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </div>
              ) : (
                "Delete Budget"
              )}
            </motion.button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
};

export default Home;