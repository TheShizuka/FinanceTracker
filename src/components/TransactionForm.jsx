// src/components/TransactionForm.jsx
import { useState } from "react";
import { motion } from "framer-motion";

const TransactionForm = ({ addTransaction, categories, addCategory }) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    addTransaction({ amount, category, date, notes });
    setAmount("");
    setCategory("food");
    setDate("");
    setNotes("");
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory("");
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-bold">Add Transaction</h2>
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-3 border rounded-lg placeholder-gray-500 dark:placeholder-gray-300 dark:bg-gray-700 dark:text-white"
        required
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white"
      >
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="New Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="w-full p-3 border rounded-lg placeholder-gray-500 dark:placeholder-gray-300 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={handleAddCategory}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Add
        </button>
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white"
        required
      />
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full p-3 border rounded-lg placeholder-gray-500 dark:placeholder-gray-300 dark:bg-gray-700 dark:text-white"
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Transaction
      </button>
    </motion.form>
  );
};

export default TransactionForm;
