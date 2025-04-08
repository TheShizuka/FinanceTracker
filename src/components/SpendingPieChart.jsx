// src/components/SpendingPieChart.jsx
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const SpendingPieChart = ({ transactions }) => {
  // Filter to only include expenses (negative amounts)
  const expenses = transactions.filter(tx => Number(tx.amount) < 0);
  
  // Group by category and calculate totals
  const categoryTotals = expenses.reduce((acc, tx) => {
    const category = tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
    const amount = Math.abs(Number(tx.amount));
    
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});
  
  // Skip rendering if no data
  if (Object.keys(categoryTotals).length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
        <p>No expense data available</p>
      </div>
    );
  }
  
  // Generate consistent colors for categories
  const generateColor = (index, total) => {
    const colorSchemes = [
      // Blues
      ['#36A2EB', '#4BC0C0', '#97BBCD', '#6FCCDD', '#1F78B4'],
      // Warm colors
      ['#FF6384', '#FF9F40', '#FFCD56', '#FFC3A0', '#FF7C43'],
      // Purple/Pinks
      ['#9966FF', '#C9CBFF', '#C45850', '#AF7AA1', '#7E57C2'],
      // Green/Teals
      ['#4CAF50', '#66BB6A', '#1B998B', '#2A9D8F', '#81B29A']
    ];
    
    // Combine all schemes if we have many categories
    const allColors = colorSchemes.flat();
    if (total > allColors.length) {
      // Dynamically generate additional colors if needed
      const h = (index * 137) % 360; // Use golden ratio for good distribution
      return `hsl(${h}, 70%, 60%)`;
    }
    
    // Select color from appropriate scheme based on total categories
    const schemeIndex = Math.min(Math.floor(total / 5), colorSchemes.length - 1);
    const colorIndex = index % colorSchemes[schemeIndex].length;
    return colorSchemes[schemeIndex][colorIndex];
  };
  
  // Prepare chart data
  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);
  const colors = categories.map((_, index) => generateColor(index, categories.length));
  
  const chartData = {
    labels: categories,
    datasets: [
      {
        data: amounts,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.6', '1')),
        borderWidth: 1,
        hoverOffset: 15,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
  };
  
  return (
    <div className="h-[300px] w-full">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default SpendingPieChart;