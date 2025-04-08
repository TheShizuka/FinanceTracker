// src/components/TransactionItem.jsx
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { FaEdit, FaTrash } from "react-icons/fa";
import { motion } from "framer-motion";
import ReactDOM from "react-dom";

// Truncate text helper
const truncateText = (text, maxLength = 30) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const TransactionItem = ({ transaction, budget, getCategoryIcon }) => {
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  
  // Format currency helper
  const formatCurrency = (amount, currency = "EUR") => {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
    });
    
    return formatter.format(amount);
  };

  // Edit transaction
  const handleEdit = (e) => {
    e.stopPropagation();
    navigate("/add-transaction", { 
      state: { 
        isIncome: Number(transaction.amount) > 0,
        transaction: transaction
      }
    });
  };
  
  // Delete transaction
  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      if (window.confirm("Are you sure you want to delete this transaction?")) {
        await deleteDoc(doc(db, "transactions", transaction.id));
        toast.success("Transaction deleted!");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  // Handle transaction click - open details
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDetails(true);
  };

  // Close details modal
  const closeDetails = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowDetails(false);
  };

  // Create portal for modal
  useEffect(() => {
    // Make sure we have a modal container
    if (!document.getElementById("modal-container")) {
      const modalContainer = document.createElement("div");
      modalContainer.id = "modal-container";
      document.body.appendChild(modalContainer);
    }
    
    // Clean up
    return () => {
      const modalContainer = document.getElementById("modal-container");
      if (modalContainer && modalContainer.childNodes.length === 0) {
        document.body.removeChild(modalContainer);
      }
    };
  }, []);

  // Render the modal
  useEffect(() => {
    if (showDetails) {
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling when modal is closed
      document.body.style.overflow = "auto";
    }
    
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showDetails]);

  const renderModal = () => {
    if (!showDetails) return null;
    
    return ReactDOM.createPortal(
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
        onClick={closeDetails}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${Number(transaction.amount) >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                {getCategoryIcon(transaction.category)}
              </div>
              
              <div>
                <p className="font-bold capitalize text-lg">{transaction.category}</p>
                <p className={`text-xl font-bold ${Number(transaction.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Number(transaction.amount) >= 0 ? '+' : ''}
                  {formatCurrency(transaction.amount, budget?.currency)}
                </p>
              </div>
            </div>
            
            <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p>{format(new Date(transaction.date), "PPPP")}</p>
              </div>
              
              {transaction.createdAt && (
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p>{format(new Date(transaction.createdAt.seconds * 1000), "h:mm a")}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="whitespace-pre-wrap">{transaction.notes || "No description"}</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600"
                onClick={handleEdit}
              >
                <FaEdit className="mr-2" />
                Edit
              </button>
              <button 
                className="flex-1 py-2 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600"
                onClick={handleDelete}
              >
                <FaTrash className="mr-2" />
                Delete
              </button>
            </div>
            
            <button 
              className="w-full py-2 text-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={closeDetails}
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.getElementById("modal-container")
    );
  };

  return (
    <>
      <div 
        className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-center">
          {/* Left - Category icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${Number(transaction.amount) >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {getCategoryIcon(transaction.category)}
          </div>
          
          {/* Middle and right content */}
          <div className="flex-1 grid grid-cols-2">
            {/* Middle column - Category and description */}
            <div className="pr-2">
              <p className="font-medium capitalize text-left">{transaction.category}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate text-left">
                {truncateText(transaction.notes || "No description")}
              </p>
            </div>
            
            {/* Right column - Amount and date */}
            <div className="text-right">
              <p className={`${Number(transaction.amount) >= 0 ? 'text-green-500' : 'text-red-500'} font-medium`}>
                {Number(transaction.amount) >= 0 ? '+' : ''}
                {formatCurrency(transaction.amount, budget?.currency)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(transaction.date), "MMM d")}
                {transaction.createdAt && ` • ${format(new Date(transaction.createdAt.seconds * 1000), "HH:mm")}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Render modal */}
      {renderModal()}
    </>
  );
};

export default TransactionItem;