// src/pages/AllTransactions.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { 
  format, 
  parseISO, 
  isWithinInterval, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  subDays, 
  isSameMonth 
} from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  FaArrowLeft, 
  FaCalendarAlt, 
  FaFilter, 
  FaSearch,
  FaUtensils,
  FaShoppingBag,
  FaCar,
  FaHome,
  FaGamepad,
  FaBolt,
  FaMoneyBill,
  FaFileExcel,
  FaFileDownload,
  FaClock
} from "react-icons/fa";
import TransactionItem from "../components/TransactionItem";
import ImportTransactionsModal from "../components/ImportTransactionsModal";

// Category icon mapping
const getCategoryIcon = (category) => {
  const icons = {
    food: <FaUtensils className="text-amber-500" />,
    shopping: <FaShoppingBag className="text-blue-500" />,
    transport: <FaCar className="text-green-500" />,
    housing: <FaHome className="text-purple-500" />,
    entertainment: <FaGamepad className="text-pink-500" />,
    utilities: <FaBolt className="text-yellow-500" />,
    other: <FaMoneyBill className="text-gray-500" />
  };
  
  return icons[category?.toLowerCase()] || <FaMoneyBill className="text-gray-500" />;
};

// Time frame display names - Fixed: using string literals instead of numeric keys
const timeFrameLabels = {
  "all": "All Time",
  "today": "Today",
  "yesterday": "Yesterday",
  "week": "This Week",
  "month": "This Month",
  "3month": "Last 3 Months", // Changed from 3month to "3month"
  "6month": "Last 6 Months", // Changed from 6month to "6month"
  "year": "This Year",
  "custom": "Custom Range"
};

const AllTransactions = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Time filter, category filter, custom range, etc.
  const [timeFilter, setTimeFilter] = useState("month");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [budgets, setBudgets] = useState([]);
  // Use the budgetId from location state if available
  const passedBudgetId = location.state?.selectedBudgetId || "";
  const [selectedBudgetId, setSelectedBudgetId] = useState(passedBudgetId);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch budgets for user
  useEffect(() => {
    if (!user) return;
    
    const unsubBudgets = onSnapshot(
      query(collection(db, "budgets"), where("userId", "==", user.uid)),
      (snapshot) => {
        const userBudgets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setBudgets(userBudgets);
        
        // If we have no selected budget but do have budgets, default to the first
        if (userBudgets.length > 0 && !selectedBudgetId) {
          setSelectedBudgetId(userBudgets[0].id);
        }
      }
    );
    
    return () => unsubBudgets();
  }, [user, selectedBudgetId]);

  // Fetch transactions for selected budget
  useEffect(() => {
    if (!user || !selectedBudgetId) return;
    
    setLoading(true);
    const qTx = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("budgetId", "==", selectedBudgetId),
      orderBy("date", "desc")
    );
    
    const unsub = onSnapshot(qTx, (snapshot) => {
      const txs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user, selectedBudgetId]);

  // Apply filters
  useEffect(() => {
    if (transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }
    
    // 1) Filter by category if selected
    let filtered = transactions;
    if (categoryFilter) {
      filtered = filtered.filter(tx => tx.category === categoryFilter);
    }
    
    // 2) Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.category.toLowerCase().includes(term) ||
        (tx.notes && tx.notes.toLowerCase().includes(term))
      );
    }

    // 3) Filter by time range
    const now = new Date();

    // NEW: If "all" is selected, skip date-based filtering
    if (timeFilter === "all") {
      setFilteredTransactions(filtered);
      return;
    }

    let startDate = new Date(0); // earliest possible date
    let endDate = now;

    if (timeFilter === "custom" && customStartDate) {
      // custom range
      startDate = startOfDay(parseISO(customStartDate));
      endDate = customEndDate ? endOfDay(parseISO(customEndDate)) : now;
    } else {
      switch (timeFilter) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "yesterday":
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
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
          break;
      }
    }

    // Apply date filtering
    const finalFiltered = filtered.filter(tx => {
      const txDate = parseISO(tx.date);

      // For "month" specifically, we only include the current month
      if (timeFilter === "month") {
        return isSameMonth(txDate, now);
      }
      
      return isWithinInterval(txDate, { start: startDate, end: endDate });
    });
    
    setFilteredTransactions(finalFiltered);
  }, [
    transactions, 
    timeFilter, 
    categoryFilter,
    customStartDate, 
    customEndDate, 
    searchTerm
  ]);

  // Format currency
  const formatCurrency = (amount) => {
    const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
    const currency = selectedBudget?.currency || "EUR";
    
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Group transactions by date for display
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});
  
  // Sort transactions within each day by created time (newest first)
  Object.keys(groupedTransactions).forEach(date => {
    groupedTransactions[date].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.seconds - a.createdAt.seconds;
      }
      // fallback to ID if timestamps aren't available
      return a.id < b.id ? 1 : -1;
    });
  });

  // Calculate total for a day
  const getDayTotal = (txList) => {
    return txList.reduce((sum, tx) => sum + Number(tx.amount), 0);
  };

  // Toggle filter panel
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Handle export
  const handleExportTransactions = async () => {
    const XLSX = await import('xlsx');
    if (filteredTransactions.length === 0) {
      toast.info("No transactions to export");
      return;
    }

    // Convert filtered transactions to export format
    const exportData = filteredTransactions.map(tx => ({
      date: tx.date,
      amount: tx.amount,
      category: tx.category,
      notes: tx.notes || ""
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    
    // Add column headers
    XLSX.utils.sheet_add_aoa(ws, [
      ["date", "amount", "category", "notes"]
    ], { origin: "A1" });
    
    // Auto-size columns
    const max_width = 20;
    ws['!cols'] = [
      { wch: 12 }, // date
      { wch: 10 }, // amount
      { wch: 15 }, // category 
      { wch: max_width } // notes
    ];
    
    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
    const budgetName = selectedBudget ? selectedBudget.name.replace(/\s+/g, '_') : 'all';
    const filename = `transactions_${budgetName}_${today}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    toast.success("Transactions exported successfully!");
  };

  // Handle successful import
  const handleImportSuccess = (count) => {
    toast.success(`Successfully imported ${count} transactions!`);
    setShowImportModal(false);
  };

  // JSX RENDERING BELOW
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  return (
    <div className="max-w-md mx-auto animate-fadeIn">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => navigate("/", { state: { selectedBudgetId } })}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go to home"
        >
          <FaArrowLeft />
        </button>
        <h1 className="heading-lg">Transactions</h1>
      </div>
      
      {/* Time frame indicator */}
      <div className="flex items-center mb-3 text-sm">
        <FaClock className="text-gray-500 mr-2" />
        <span>Time frame: </span>
        <button 
          onClick={toggleFilters}
          className="ml-2 font-medium text-primary px-2 py-0.5 bg-primary-light/10 rounded-full flex items-center"
        >
          {timeFrameLabels[timeFilter]}
          <FaFilter className="ml-1 text-xs" />
        </button>
      </div>
      
      {/* Search and filter bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none icon-container">
              <FaSearch className="text-gray-400" />
            </div>
            <input 
              type="text"
              placeholder="Search transactions"
              className="form-input pl-10 pr-4 py-2 w-full search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 ml-2">
            <button 
              className="px-2.5 py-2 rounded-md bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-600 dark:text-amber-300 flex items-center gap-1"
              onClick={() => setShowImportModal(true)}
              title="Import Transactions"
            >
              <FaFileExcel className="text-amber-600 dark:text-amber-300" />
              <span className="text-xs whitespace-nowrap">Import</span>
            </button>
            
            <button 
              className="px-2.5 py-2 rounded-md bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-300 flex items-center gap-1"
              onClick={handleExportTransactions}
              title="Export Transactions"
            >
              <FaFileDownload className="text-green-600 dark:text-green-300" />
              <span className="text-xs whitespace-nowrap">Export</span>
            </button>
            
            <button 
              className={`p-2 rounded-md ${showFilters ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
              onClick={toggleFilters}
              title="Filter Transactions"
            >
              <FaFilter />
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="space-y-4 animate-slideUp">
            {/* Budget Picker */}
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
            
            {/* Time + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="timeFilter" className="form-label">Time Period</label>
                <select
                  id="timeFilter"
                  className="form-input mt-1"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  {/* Fixed: using string values */}
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="3month">Last 3 Months</option>
                  <option value="6month">Last 6 Months</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="categoryFilter" className="form-label">Category</label>
                <select
                  id="categoryFilter"
                  className="form-input mt-1"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="food">Food & Drinks</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="coffee">Coffee & Snacks</option>
                  <option value="groceries">Groceries</option>
                  <option value="shopping">Shopping</option>
                  <option value="transport">Transport</option>
                  <option value="housing">Housing</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="utilities">Utilities</option>
                  <option value="travel">Travel</option>
                  <option value="medical">Medical</option>
                  <option value="education">Education</option>
                  <option value="salary">Salary</option>
                  <option value="investment">Investment</option>
                  <option value="gift">Gift</option>
                  <option value="refund">Refund</option>
                  <option value="freelance">Freelance</option>
                  <option value="passive">Passive Income</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            {/* Custom Range */}
            {timeFilter === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="form-label">Start Date</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="startDate"
                      className="form-input pl-10"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="endDate" className="form-label">End Date</label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="endDate"
                      className="form-input pl-10"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Transactions list */}
      {filteredTransactions.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions found</p>
          <button
            onClick={() => navigate("/add-transaction", { state: { selectedBudgetId } })}
            className="btn btn-primary"
          >
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions)
            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
            .map(([date, txs]) => (
              <div key={date} className="card overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{format(parseISO(date), "EEEE")}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(parseISO(date), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className={`text-right ${getDayTotal(txs) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(getDayTotal(txs))}
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {txs.map((tx) => (
                    <TransactionItem 
                      key={tx.id}
                      transaction={tx}
                      budget={selectedBudget}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Import Transactions Modal */}
      <ImportTransactionsModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        userId={user?.uid}
        budgetId={selectedBudgetId}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default AllTransactions;