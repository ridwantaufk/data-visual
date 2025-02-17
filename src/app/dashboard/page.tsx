"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Download, FileText, LogOut, Search, Moon, Sun } from "lucide-react";
import RechartsPieChart from "./RechartsPieChart";
import ChartComponent from "./ChartJS";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

type Fee = {
  platform_sharing_revenue?: number | null;
  mdr_qris?: number | null;
};

type PaymentDetail = {
  transaction_id: string;
  transaction_status: string;
  transaction_time: string;
  order_id: string;
  issuer: string;
};

type Product = {
  device_id: string;
  price: number;
  name: string;
  location: string;
  sku: string;
  quantity?: number; // Optional, karena tidak semua produk memiliki quantity
};

type Payment = {
  amount: number;
  method: string;
  nett: number;
  fee?: Fee; // Optional, karena fee mungkin tidak ada
  detail: PaymentDetail;
};

type TransactionDetail = {
  transaction_status: string;
  order_id: string;
};

type TransactionTime = {
  firestore_timestamp: {
    _seconds: number;
    _nanoseconds: number;
  };
  timestamp: number;
};

type Transaction = {
  product: Product;
  payment: Payment;
  detail: TransactionDetail;
  time: TransactionTime;
};

type UserData = {
  [key: string]: Transaction;
};

type TransactionResult = {
  id: string;
  productName: string;
  productDeviceId: string;
  productPrice: number;
  productLocation: string;
  productSku: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentNett: number;
  paymentFeePlatformSharingRevenue: number | null;
  paymentFeeMdrQris: number | null;
  transactionId: string;
  transactionStatus: string;
  transactionTime: string;
  orderId: string;
  issuer: string;
  date: string;
};

interface User {
  data: Record<string, Transaction>;
  message: string;
}

function GlobalFilter({
  isDarkMode,
  filter,
  setFilter,
}: {
  isDarkMode: boolean;
  filter: string;
  setFilter: (value: string) => void;
}) {
  return (
    <div className="relative w-full max-w-md mb-3">
      <input
        className={`w-full p-1 pl-12 text-lg rounded-full shadow-lg ${
          isDarkMode
            ? "text-purple-400 bg-gray-800"
            : "border-gray-300 border text-gray-500 bg-white"
        } focus:ring-4 focus:ring-blue-400 focus:outline-none transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/50`}
        type="text"
        placeholder="Cari transaksi.."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
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
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const transactions: Array<TransactionResult> = useMemo(() => {
    if (!user || !user.data) return [];

    const transactionEntries = Object.entries(user.data).map(
      ([id, transaction]: [string, Transaction]) => {
        // generate timestamp dari firestore
        const formattedDate: Date = new Date(
          transaction.time.firestore_timestamp._seconds * 1000
        );

        // format tanggal
        const options: Intl.DateTimeFormatOptions = {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour12: false,
        };

        const dateTimeString: string = formattedDate.toLocaleString(
          "id-ID",
          options
        );
        const dateString: string = isNaN(formattedDate.getTime())
          ? "Tidak ada tanggal"
          : dateTimeString;

        return {
          id,
          productName: transaction.product?.name || "Tidak Diketahui",
          productDeviceId: transaction.product?.device_id || "-",
          productPrice: transaction.product?.price || 0,
          productLocation: transaction.product?.location || "-",
          productSku: transaction.product?.sku || "-",
          paymentAmount: transaction.payment?.amount || 0,
          paymentMethod: transaction.payment?.method || "-",
          paymentNett: transaction.payment?.nett || 0,
          paymentFeePlatformSharingRevenue:
            transaction.payment?.fee?.platform_sharing_revenue || null,
          paymentFeeMdrQris: transaction.payment?.fee?.mdr_qris || null,
          transactionId: transaction.payment?.detail?.transaction_id || "-",
          transactionStatus:
            transaction.payment?.detail?.transaction_status || "-",
          transactionTime: transaction.payment?.detail?.transaction_time || "",
          orderId: transaction.payment?.detail?.order_id || "-",
          issuer: transaction.payment?.detail?.issuer || "-",
          date: dateString,
          timestamp: formattedDate,
        };
      }
    );

    // sortir data berdasarkan waktu terbaru
    transactionEntries.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return transactionEntries;
  }, [user]);

  const pieChartData = useMemo(() => {
    const methods = Array.from(
      new Set(transactions.map((txn) => txn.paymentMethod))
    );

    return methods.map((method) => ({
      id: method,
      value: transactions.filter((txn) => txn.paymentMethod === method).length,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    }));
  }, [transactions]);

  const generatePDF = () => {
    const pdf = new jsPDF();

    const input1 = document.getElementById("report1") as HTMLElement;
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

        const input2 = document.getElementById("report2") as HTMLElement;
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
      "Nama Produk": txn.productName,
      "Device ID": txn.productDeviceId,
      Harga: txn.productPrice,
      Lokasi: txn.productLocation,
      SKU: txn.productSku,
      Jumlah: txn.paymentAmount,
      "Metode Pembayaran": txn.paymentMethod,
      Nett: txn.paymentNett,
      "Fee Platform Sharing Revenue": txn.paymentFeePlatformSharingRevenue,
      "Fee MDR QRIS": txn.paymentFeeMdrQris,
      "Transaction ID": txn.transactionId,
      "Status Transaksi": txn.transactionStatus,
      "Waktu Transaksi": txn.transactionTime,
      "Order ID": txn.orderId,
      Issuer: txn.issuer,
      Tanggal: txn.date,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Transaksi");
    XLSX.writeFile(workbook, "report.xlsx");
  };

  const chartLabels = useMemo(
    () => transactions.map((txn) => txn.productName),
    [transactions]
  );

  const chartData = useMemo(
    () => transactions.map((txn) => txn.paymentAmount),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesGlobalFilter =
        txn.productName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        txn.paymentMethod.toLowerCase().includes(globalFilter.toLowerCase()) ||
        txn.transactionStatus
          .toLowerCase()
          .includes(globalFilter.toLowerCase());

      const matchesColumnFilters = Object.entries(columnFilters).every(
        ([key, value]) =>
          String(txn[key as keyof TransactionResult])
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
      { header: "Nama Produk", accessorKey: "productName" },
      { header: "Jumlah", accessorKey: "paymentAmount" },
      { header: "Metode Pembayaran", accessorKey: "paymentMethod" },
      { header: "Status Transaksi", accessorKey: "transactionStatus" },
      { header: "Tanggal", accessorKey: "date" },
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

  type TransactionDetailModalProps = {
    transaction: TransactionResult | null;
    onClose: () => void;
  };

  const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
    transaction,
    onClose,
  }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          modalRef.current &&
          !modalRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      window.addEventListener("mousedown", handleClickOutside);
      return () => {
        window.removeEventListener("mousedown", handleClickOutside);
      };
    }, [onClose]);

    if (!transaction) return null;

    return (
      <div className="fixed z-50 top-0 inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div
          ref={modalRef}
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } p-6 rounded-lg shadow-lg max-h-[calc(100vh-20px)] overflow-y-auto relative`}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <FaTimes size={24} />
          </button>

          <h2 className="text-xl font-bold mb-4">Detail Transaksi</h2>

          <table className="min-w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">Field</th>
                <th className="border p-2">Value</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border p-2">ID Transaksi</td>
                <td className="border p-2">{transaction.id}</td>
              </tr>
              <tr>
                <td className="border p-2">Nama Produk</td>
                <td className="border p-2">{transaction.productName}</td>
              </tr>
              <tr>
                <td className="border p-2">Device ID</td>
                <td className="border p-2">{transaction.productDeviceId}</td>
              </tr>
              <tr>
                <td className="border p-2">Harga</td>
                <td className="border p-2">{transaction.productPrice}</td>
              </tr>
              <tr>
                <td className="border p-2">Lokasi</td>
                <td className="border p-2">{transaction.productLocation}</td>
              </tr>
              <tr>
                <td className="border p-2">SKU</td>
                <td className="border p-2">{transaction.productSku}</td>
              </tr>
              <tr>
                <td className="border p-2">Jumlah</td>
                <td className="border p-2">{transaction.paymentAmount}</td>
              </tr>
              <tr>
                <td className="border p-2">Metode Pembayaran</td>
                <td className="border p-2">{transaction.paymentMethod}</td>
              </tr>
              <tr>
                <td className="border p-2">Nett</td>
                <td className="border p-2">{transaction.paymentNett}</td>
              </tr>
              <tr>
                <td className="border p-2">Transaction ID</td>
                <td className="border p-2">{transaction.transactionId}</td>
              </tr>
              <tr>
                <td className="border p-2">Status Transaksi</td>
                <td className="border p-2">{transaction.transactionStatus}</td>
              </tr>
              <tr>
                <td className="border p-2">Waktu Transaksi</td>
                <td className="border p-2">{transaction.transactionTime}</td>
              </tr>
              <tr>
                <td className="border p-2">Order ID</td>
                <td className="border p-2">{transaction.orderId}</td>
              </tr>
              <tr>
                <td className="border p-2">Issuer</td>
                <td className="border p-2">{transaction.issuer}</td>
              </tr>
              <tr>
                <td className="border p-2">Tanggal</td>
                <td className="border p-2">{transaction.date}</td>
              </tr>
            </tbody>
          </table>

          <button
            onClick={onClose}
            className="mt-4 bg-blue-500 text-white p-2 rounded"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col items-center min-h-screen p-6 ${containerClass}`}
    >
      {isModalOpen && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <h1 className="text-4xl font-extrabold drop-shadow-lg mb-8 transform transition-all duration-300 hover:scale-105">
        Data Transaksi
      </h1>
      <button
        onClick={toggleDarkMode}
        className="flex items-center border border-gray-600 text-gray-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 mb-8"
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
        } transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50`}
      >
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <GlobalFilter
            isDarkMode={isDarkMode}
            filter={globalFilter}
            setFilter={setGlobalFilter}
          />

          <div className="flex space-x-4 mt-4 md:mt-0">
            <button
              onClick={generatePDF}
              className="flex items-center border border-blue-600 text-blue-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 transform hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Unduh PDF
            </button>
            <button
              onClick={generateExcel}
              className="flex items-center border border-green-600 text-green-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 transform hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Unduh Excel
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center border-2 border-red-600 text-red-600 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 transform hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </button>
        </div>

        <div className={`border-transparent overflow-auto max-h-[500px]`}>
          <table className="w-full border-collapse border rounded-lg overflow-hidden shadow-lg">
            <thead
              className={`${
                isDarkMode
                  ? "text-blue-300 bg-gradient-to-r from-gray-900 to-purple-900"
                  : "text-white bg-gradient-to-r from-blue-500 to-purple-500"
              } `}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="  p-3 text-center">
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
                    <th key={header.id} className=" p-2">
                      <input
                        type="text"
                        placeholder={` Cari ${header.column.columnDef.header}`}
                        className={`w-full font-normal ${
                          isDarkMode
                            ? "text-purple-400 bg-gray-900"
                            : "text-gray-500"
                        } p-1  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200`}
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
            <tbody
              className={` ${
                isDarkMode ? "text-purple-700" : "bg-gray-50 text-gray-700"
              }`}
            >
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`transition-transform duration-200 ${
                    isDarkMode ? "hover:bg-black" : "hover:bg-blue-300"
                  } ${
                    index % 2 === 0
                      ? isDarkMode
                        ? "bg-gray-950"
                        : "bg-blue-100"
                      : isDarkMode
                      ? "bg-gray-900"
                      : "bg-white"
                  } cursor-pointer`}
                  onClick={() => {
                    setSelectedTransaction(row.original);
                    setIsModalOpen(true);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="p-2 transition-transform duration-200 hover:scale-105"
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
        className={`w-full ${
          isDarkMode ? "bg-gray-700" : "bg-white"
        } max-w-6xl shadow-xl rounded-3xl mt-8 p-6 transform transition-all duration-300 hover:shadow-blue-500/50 mb-8 text-center`}
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
        className={`w-full max-w-6xl ${
          isDarkMode ? "bg-gray-700" : "bg-white"
        } shadow-xl rounded-3xl p-6 transform transition-all duration-300 hover:shadow-blue-500/50 mb-8 text-center`}
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
