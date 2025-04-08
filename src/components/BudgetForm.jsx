// src/components/BudgetForm.jsx
import { useState } from "react";

const BudgetForm = ({ budget, updateBudget }) => {
  const [newBudget, setNewBudget] = useState(budget);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateBudget(newBudget);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold">Set Monthly Budget</h2>
      <input
        type="number"
        placeholder="Budget"
        value={newBudget}
        onChange={(e) => setNewBudget(e.target.value)}
        className="w-full p-3 border rounded-lg placeholder-gray-500 dark:placeholder-gray-300 dark:bg-gray-700 dark:text-white"
        required
      />
      <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors">
        Set Budget
      </button>
    </form>
  );
};

export default BudgetForm;
