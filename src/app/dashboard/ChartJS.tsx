import React from "react";
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

// Function to aggregate data by label
const aggregateData = (labels: string[], data: number[]) => {
  const aggregated: { [key: string]: number } = {};

  labels.forEach((label, index) => {
    if (aggregated[label]) {
      aggregated[label] += data[index]; // Sum values for the same label
    } else {
      aggregated[label] = data[index];
    }
  });

  // Prepare labels and values for the chart
  const aggregatedLabels = Object.keys(aggregated);
  const aggregatedValues = Object.values(aggregated);

  return { aggregatedLabels, aggregatedValues };
};

const ChartComponent: React.FC<ChartDataProps> = ({ labels, data }) => {
  // Aggregate the data
  const { aggregatedLabels, aggregatedValues } = aggregateData(labels, data);

  const chartData = {
    labels: aggregatedLabels,
    datasets: [
      {
        label: "Jumlah Transaksi ",
        data: aggregatedValues,
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
