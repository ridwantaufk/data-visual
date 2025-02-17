import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface PieChartData {
  id: string;
  value: number;
  color?: string;
}

interface RechartsPieChartProps {
  data: PieChartData[];
}

const RechartsPieChart: React.FC<RechartsPieChartProps> = ({ data }) => {
  return (
    <PieChart width={400} height={400}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="id"
        outerRadius={80}
        fill="#8884d8"
        label
      >
        {data.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={
              entry.color ||
              `#${Math.floor(Math.random() * 16777215).toString(16)}`
            }
          />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
};

export default RechartsPieChart;
