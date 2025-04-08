// src/components/GroupTransactionItem.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTrash, FaEdit, FaEllipsisV, FaUserAlt,
  FaChevronDown, FaChevronUp, FaUsers
} from "react-icons/fa";

const GroupTransactionItem = ({ 
  transaction, 
  currencySymbol = "$",
  canEdit = true,
  groupId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const swipeThreshold = 80;
  const optionsRef = useRef(null);
  const navigate = useNavigate();
  
  // Handle click outside of options menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleDelete = async () => {
    try {
      if (groupId) {
        // If it's an expense in a budget group, update the spent amount
        if (transaction.amount < 0) {
          const groupRef = doc(db, "groups", groupId);
          await updateDoc(groupRef, {
            spent: increment(-Math.abs(transaction.amount))
          });
        }
        
        await deleteDoc(doc(db, "groupTransactions", transaction.id));
        toast.success("Transaction deleted");
      }
      setShowConfirmDelete(false);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Error deleting transaction");
    }
  };
  
  const handleEdit = () => {
    if (groupId) {
      navigate(`/group/${groupId}/edit-transaction/${transaction.id}`);
    }
    setShowOptions(false);
  };
  
  // Touch event handlers for swipe
  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    
    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, swipeThreshold));
    }
  };
  
  const handleTouchEnd = () => {
    if (swipeOffset >= swipeThreshold / 2) {
      setSwipeOffset(swipeThreshold);
    } else {
      setSwipeOffset(0);
    }
  };
  
  // Mouse event handlers for swipe on desktop
  const handleMouseDown = (e) => {
    setStartX(e.clientX);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  
  const handleMouseMove = (e) => {
    const currentX = e.clientX;
    const diff = startX - currentX;
    
    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, swipeThreshold));
    }
  };
  
  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    
    if (swipeOffset >= swipeThreshold / 2) {
      setSwipeOffset(swipeThreshold);
    } else {
      setSwipeOffset(0);
    }
  };
  
  const resetSwipe = () => {
    setSwipeOffset(0);
  };
  
  // Check if we're on a mobile device - show swipe UI only on mobile
  const isMobile = window.innerWidth <= 768;
  
  // Format the date with time
  const formattedDate = transaction.date 
    ? format(new Date(transaction.date), "MMM d, yyyy")
    : "";
  
  const formattedTime = transaction.date 
    ? format(new Date(transaction.date), "h:mm a")
    : "";
  
  const amount = Number(transaction.amount);
  const isIncome = amount > 0;
  
  return (
    <div className="relative overflow-hidden">
      {/* Swipe actions - visible when swiped */}
      {canEdit && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-gray-100 dark:bg-gray-700"
          style={{ width: swipeThreshold + "px" }}
        >
          {transaction.amount < 0 && (
            <button 
              onClick={handleEdit}
              className="h-full flex items-center justify-center w-1/2 bg-blue-500 text-white"
            >
              <FaEdit size={18} />
            </button>
          )}
          <button 
            onClick={() => setShowConfirmDelete(true)}
            className="h-full flex items-center justify-center w-1/2 bg-red-500 text-white"
          >
            <FaTrash size={18} />
          </button>
        </div>
      )}
      
      {/* Main transaction card */}
      <motion.div 
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 ${isMobile ? "cursor-grab active:cursor-grabbing" : ""}`}
        animate={{ x: -swipeOffset }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onMouseDown={!isMobile && canEdit ? handleMouseDown : undefined}
        onClick={resetSwipe}
      >
        <div className="flex items-start">
          {/* Category icon or member photo for group transactions */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
            isIncome 
              ? "bg-green-100 dark:bg-green-900/30" 
              : "bg-red-100 dark:bg-red-900/30"
          }`}>
            {transaction.memberPhoto ? (
              <img 
                src={transaction.memberPhoto} 
                alt={transaction.memberName} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : isIncome ? (
              <span className="text-green-500 text-lg font-bold">+</span>
            ) : (
              <span className="text-red-500 text-lg font-bold">-</span>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium dark:text-white">
                  {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                  {transaction.memberName && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      • {transaction.memberName}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formattedDate} • {formattedTime}
                </div>
              </div>
              
              <div className={`font-bold ${
                isIncome 
                  ? "text-green-500" 
                  : "text-red-500"
              }`}>
                {isIncome ? "+" : ""}{currencySymbol}{Math.abs(amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
            
            {transaction.description && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 transaction-description">
                {transaction.description.length > 50 && !isExpanded 
                  ? transaction.description.substring(0, 50) + "..." 
                  : transaction.description}
              </div>
            )}
            
            {transaction.description && transaction.description.length > 50 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-xs text-blue-500 mt-1 flex items-center"
              >
                {isExpanded ? (
                  <>Show less <FaChevronUp className="ml-1" size={10} /></>
                ) : (
                  <>Show more <FaChevronDown className="ml-1" size={10} /></>
                )}
              </button>
            )}
            
            {/* Split information for group transactions */}
            {transaction.splitWith && transaction.splitWith.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <FaUsers className="mr-1" /> 
                Split with {transaction.splitWith.length} {transaction.splitWith.length === 1 ? "person" : "people"}
              </div>
            )}
          </div>
          
          {/* For desktop devices, show action buttons directly */}
          {!isMobile && canEdit && (
            <div className="flex space-x-2 ml-2">
              {transaction.amount < 0 && (
                <button 
                  onClick={handleEdit}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <FaEdit size={16} />
                </button>
              )}
              <button 
                onClick={() => setShowConfirmDelete(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <FaTrash size={16} />
              </button>
            </div>
          )}
          
          {/* For mobile devices - options menu trigger */}
          {isMobile && canEdit && (
            <div ref={optionsRef} className="relative ml-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <FaEllipsisV size={16} />
              </button>
              
              {/* Options dropdown */}
              {showOptions && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 min-w-32">
                  {transaction.amount < 0 && (
                    <button 
                      onClick={handleEdit}
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <FaEdit className="mr-2" size={14} />
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setShowOptions(false);
                      setShowConfirmDelete(true);
                    }}
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                  >
                    <FaTrash className="mr-2" size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-xl font-semibold mb-4 dark:text-white">Delete Transaction?</h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupTransactionItem;