// ChartComponent.tsx
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartDataProps {
  labels: string[];
  data: number[];
}

const ChartComponent: React.FC<ChartDataProps> = ({ labels, data }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "Transaction Amount",
        data: data,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Transaction Overview",
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default ChartComponent;
