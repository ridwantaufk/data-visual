"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Download, FileText, LogOut, Search, Moon, Sun } from "lucide-react";
import RechartsPieChart from "./RechartsPieChart";
import ChartComponent from "./ChartJS";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

// Define interfaces
interface TransactionDetail {
  order_id: string;
  transaction_status: string;
  refund_amount?: number;
  refund_time?: number;
}

interface Payment {
  amount: number;
  method: string;
  nett: number;
  fee?: {
    platform_sharing_revenue: number;
  };
}

interface Product {
  device_id: string;
  column: string;
  name: string;
  sku: string;
}

interface Transaction {
  product: Product;
  payment: Payment;
  detail: TransactionDetail;
  time?: {
    firestore_timestamp?: {
      _seconds: number;
      _nanoseconds: number;
    };
    timestamp: number;
  };
  created_at: string;
}

interface User {
  data: Record<string, Transaction>;
  message: string;
}

function GlobalFilter({
  filter,
  setFilter,
}: {
  filter: string;
  setFilter: (value: string) => void;
}) {
  return (
    <div className="relative w-full max-w-md mb-3">
      <input
        className="w-full p-1 pl-12 text-lg border border-gray-300 rounded-full shadow-lg text-gray-500 bg-white focus:ring-4 focus:ring-blue-400 focus:outline-none transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/50"
        type="text"
        placeholder="Cari transaksi.."
        value={filter}
        onChange={(e) => setFilter(e.target.value)} // Make sure this is working
      />
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth() as { user: User | null };
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [pageIndex, setPageIndex] = useState<number>(0);
  const pageSize = 10;
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  const containerClass = isDarkMode
    ? "bg-gray-800 text-white"
    : "bg-white text-black";

  if (!user) {
    return null;
  }

  useEffect(() => {
    console.log("Global Filter:", globalFilter);
  }, [globalFilter]);

  const handleLogout = async () => {
    try {
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const transactions: Array<{
    id: string;
    product: string;
    amount: number;
    method: string;
    status: string;
    date: string;
  }> = useMemo(() => {
    if (!user || !user.data) return [];
    return Object.entries(user.data).map(
      ([id, transaction]: [string, Transaction]) => {
        // Log the created_at value
        console.log(transaction.created_at);

        // Parse the date
        const formattedDate = new Date(transaction.created_at);
        const dateString = isNaN(formattedDate.getTime())
          ? "Invalid Date"
          : formattedDate.toLocaleDateString();

        return {
          id,
          product: transaction.product?.name || "Unknown",
          amount: transaction.payment?.amount || 0,
          method: transaction.payment?.method || "N/A",
          status: transaction.detail?.transaction_status || "N/A",
          date: dateString, // Use the formatted date
        };
      }
    );
  }, [user]);

  const pieChartData = useMemo(() => {
    const methods = Array.from(new Set(transactions.map((txn) => txn.method)));
    return methods.map((method) => ({
      id: method,
      value: transactions.filter((txn) => txn.method === method).length,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color for each method
    }));
  }, [transactions]);

  const generatePDF = () => {
    const pdf = new jsPDF();

    const input1 = document.getElementById("report1") as HTMLElement; // Type assertion
    if (input1) {
      html2canvas(input1).then((canvas) => {
        const imgData1 = canvas.toDataURL("image/png");
        pdf.addImage(
          imgData1,
          "PNG",
          10,
          10,
          190,
          (canvas.height * 190) / canvas.width
        );
        pdf.addPage();

        const input2 = document.getElementById("report2") as HTMLElement; // Type assertion
        if (input2) {
          html2canvas(input2).then((canvas) => {
            const imgData2 = canvas.toDataURL("image/png");
            pdf.addImage(
              imgData2,
              "PNG",
              10,
              10,
              190,
              (canvas.height * 190) / canvas.width
            );
            pdf.save("report.pdf");
          });
        } else {
          console.error('Element with ID "report2" not found.');
        }
      });
    } else {
      console.error('Element with ID "report1" not found.');
    }
  };

  const generateExcel = () => {
    const data = transactions.map((txn) => ({
      "ID Transaksi": txn.id,
      "Nama Produk": txn.product,
      Jumlah: txn.amount,
      "Metode Pembayaran": txn.method,
      Status: txn.status,
      Tanggal: txn.date,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Transaksi");
    XLSX.writeFile(workbook, "report.xlsx");
  };

  const chartLabels = useMemo(
    () => transactions.map((txn) => txn.product),
    [transactions]
  );
  const chartData = useMemo(
    () => transactions.map((txn) => txn.amount),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesGlobalFilter =
        txn.product.toLowerCase().includes(globalFilter.toLowerCase()) ||
        txn.method.toLowerCase().includes(globalFilter.toLowerCase()) ||
        txn.status.toLowerCase().includes(globalFilter.toLowerCase());

      const matchesColumnFilters = Object.entries(columnFilters).every(
        ([key, value]) =>
          String(txn[key as keyof typeof txn])
            .toLowerCase()
            .includes(value.toLowerCase())
      );

      return matchesGlobalFilter && matchesColumnFilters;
    });
  }, [transactions, globalFilter, columnFilters]);

  const paginatedTransactions = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, pageIndex, pageSize]);

  const columns = useMemo(
    () => [
      { header: "ID Transaksi", accessorKey: "id" },
      { header: "Nama Produk", accessorKey: "product" },
      { header: "Jumlah", accessorKey: "amount" },
      { header: "Metode Pembayaran", accessorKey: "method" },
      { header: "Status", accessorKey: "status" },
    ],
    []
  );

  const table = useReactTable({
    data: paginatedTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <div
      className={`flex flex-col items-center min-h-screen p-6 ${containerClass}`}
    >
      <h1 className="text-4xl font-extrabold drop-shadow-lg mb-8 transform transition-all duration-300 hover:scale-105">
        Data Transaksi
      </h1>
      <button
        onClick={toggleDarkMode}
        className="flex items-center border border-gray-600 text-gray-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 mb-4"
      >
        {isDarkMode ? (
          <Sun className="w-4 h-4 mr-2" />
        ) : (
          <Moon className="w-4 h-4 mr-2" />
        )}
        {isDarkMode ? "Light Mode" : "Dark Mode"}
      </button>

      <div
        className={`w-full max-w-6xl shadow-xl rounded-3xl p-6 ${
          isDarkMode ? "bg-gray-700" : "bg-white"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />

          <div className="flex space-x-4">
            <button
              onClick={generatePDF}
              className="flex items-center border border-blue-600 text-blue-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 transform hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate PDF
            </button>
            <button
              onClick={generateExcel}
              className="flex items-center border border-green-600 text-green-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 transform hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Excel
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center border border-red-600 text-red-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 transform hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>

        <div className="overflow-auto max-h-[500px]">
          <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-lg">
            <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border border-gray-300 p-3 text-left"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
              <tr>
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <th key={header.id} className="border border-gray-300 p-2">
                      <input
                        type="text"
                        placeholder={`Cari ${header.column.columnDef.header}`}
                        className="w-full text-gray-600 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
                        value={columnFilters[header.id] || ""}
                        onChange={(e) =>
                          setColumnFilters((prev) => ({
                            ...prev,
                            [header.id]: e.target.value,
                          }))
                        }
                      />
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="text-gray-900 bg-gray-50">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-transform duration-200 hover:bg-blue-100"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border border-gray-300 p-2 transition-transform duration-200 hover:scale-105"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={pageIndex === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg disabled:opacity-50 shadow-md hover:bg-blue-500 transition-all transform duration-200 hover:scale-105"
          >
            Sebelumnya
          </button>
          <button
            onClick={() =>
              setPageIndex((prev) =>
                (prev + 1) * pageSize < filteredTransactions.length
                  ? prev + 1
                  : prev
              )
            }
            disabled={(pageIndex + 1) * pageSize >= filteredTransactions.length}
            className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg disabled:opacity-50 shadow-md hover:bg-blue-500 transition-all transform duration-200 hover:scale-105"
          >
            Berikutnya
          </button>
        </div>
      </div>

      <div
        id="report1"
        className="w-full max-w-6xl bg-white shadow-xl rounded-3xl mt-7 p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50 mb-8 text-center"
      >
        <h2 className="text-2xl text-gray-400 font-bold mb-4">
          Distribusi Transaksi - Pie Chart
        </h2>
        <div className="flex justify-center">
          <RechartsPieChart data={pieChartData} />
        </div>
      </div>

      <div
        id="report2"
        className="w-full max-w-6xl bg-white shadow-xl rounded-3xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50 mb-8 text-center"
      >
        <h2 className="text-2xl text-gray-400 font-bold mb-4">
          Tren Penjualan - Line Chart
        </h2>
        <div className="flex justify-center">
          <ChartComponent labels={chartLabels} data={chartData} />
        </div>
      </div>
    </div>
  );
}
