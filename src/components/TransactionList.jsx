// src/components/TransactionList.jsx
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash, FaArrowUp, FaArrowDown } from "react-icons/fa";

const TransactionList = ({ transactions, deleteTransaction }) => {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold dark:text-white">Transactions</h2>
      <AnimatePresence>
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id || index}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-shadow hover:shadow-xl"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {Number(transaction.amount) >= 0 ? (
                  <FaArrowUp className="text-green-500 mr-2" />
                ) : (
                  <FaArrowDown className="text-red-500 mr-2" />
                )}
                <div>
                  <p className="font-bold">{transaction.category}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.notes}</p>
                </div>
              </div>
              <div className="flex items-center">
                <p className="font-semibold text-xl">
                  {Number(transaction.amount) >= 0 ? "+" : "-"}${Math.abs(transaction.amount)}
                </p>
                <button
                  onClick={() => deleteTransaction(transaction.id)}
                  className="ml-4 bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors flex items-center"
                >
                  <FaTrash className="mr-1" /> Delete
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{transaction.date}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default TransactionList;
