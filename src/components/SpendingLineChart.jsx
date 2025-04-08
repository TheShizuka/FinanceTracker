// src/components/SpendingLineChart.jsx
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { format, parseISO, compareAsc } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SpendingLineChart = ({ transactions }) => {
  // Skip rendering if no data
  if (transactions.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }
  
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => {
    return compareAsc(parseISO(a.date), parseISO(b.date));
  });
  
  // Group by month and calculate spending and income
  const monthlyData = sortedTransactions.reduce((acc, transaction) => {
    const date = parseISO(transaction.date);
    const monthYear = format(date, "MMM yyyy");
    
    if (!acc[monthYear]) {
      acc[monthYear] = { 
        spending: 0, 
        income: 0,
        balance: 0 
      };
    }
    
    const amount = Number(transaction.amount);
    if (amount < 0) {
      acc[monthYear].spending += Math.abs(amount);
    } else {
      acc[monthYear].income += amount;
    }
    
    acc[monthYear].balance += amount;
    
    return acc;
  }, {});
  
  // Prepare chart data
  const months = Object.keys(monthlyData);
  const spending = months.map(month => monthlyData[month].spending);
  const income = months.map(month => monthlyData[month].income);
  const balance = months.map(month => monthlyData[month].balance);
  
  // Calculate running balance
  let runningBalance = 0;
  const runningBalances = months.map(month => {
    runningBalance += monthlyData[month].balance;
    return runningBalance;
  });
  
  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Spending",
        data: spending,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Income",
        data: income,
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.1)",
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Running Balance",
        data: runningBalances,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
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
        grid: {
          display: true,
          drawBorder: false,
        },
        ticks: {
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
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SpendingLineChart;