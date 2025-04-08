// src/pages/Charts.jsx
import SpendingPieChart from "../components/SpendingPieChart";
import MonthlyBarChart from "../components/MonthlyBarChart";
import SpendingLineChart from "../components/SpendingLineChart";
import BackButton from "../components/BackButton";

const Charts = () => {
  // Replace with actual transactions data as needed.
  const transactions = [];

  return (
    <div className="p-6 relative">
      <BackButton />
      <h1 className="text-3xl font-bold mb-6">Charts</h1>
      <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <MonthlyBarChart transactions={transactions} />
      </div>
      <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <SpendingPieChart transactions={transactions} />
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <SpendingLineChart transactions={transactions} />
      </div>
    </div>
  );
};

export default Charts;
