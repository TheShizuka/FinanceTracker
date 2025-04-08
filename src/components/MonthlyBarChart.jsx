// src/components/MonthlyBarChart.jsx
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { format, parseISO } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MonthlyBarChart = ({ transactions }) => {
  // Process data: group by month and calculate income/expenses
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = parseISO(transaction.date);
    const monthYear = format(date, "MMM yyyy");
    
    if (!acc[monthYear]) {
      acc[monthYear] = { income: 0, expenses: 0 };
    }
    
    const amount = Number(transaction.amount);
    if (amount > 0) {
      acc[monthYear].income += amount;
    } else {
      acc[monthYear].expenses += Math.abs(amount);
    }
    
    return acc;
  }, {});
  
  // Sort data by date (chronologically)
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA - dateB;
  });
  
  // Prepare chart data
  const labels = sortedMonths;
  const incomeData = sortedMonths.map(month => monthlyData[month].income);
  const expensesData = sortedMonths.map(month => monthlyData[month].expenses);
  
  const chartData = {
    labels,
    datasets: [
      {
        label: "Income",
        data: incomeData,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgb(54, 162, 235)",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Expenses",
        data: expensesData,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgb(255, 99, 132)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
        },
        ticks: {
          // Include a dollar sign in the ticks
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y || 0;
            return `${label}: ${value.toLocaleString()}`;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };
  
  return (
    <div className="h-[300px] w-full">
      {transactions.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-500">
          <p>No data available</p>
        </div>
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
};

export default MonthlyBarChart;