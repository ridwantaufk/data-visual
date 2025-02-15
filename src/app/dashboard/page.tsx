"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
        placeholder="Search transactions..."
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

  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const transactions: Array<{
    id: string;
    product: string;
    amount: number;
    method: string;
    status: string;
  }> = useMemo(() => {
    if (!user || !user.data) return [];
    return Object.entries(user.data).map(
      ([id, transaction]: [string, Transaction]) => ({
        id,
        product: transaction.product?.name || "Unknown",
        amount: transaction.payment?.amount || 0,
        method: transaction.payment?.method || "N/A",
        status: transaction.detail?.transaction_status || "N/A",
      })
    );
  }, [user]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) =>
      Object.entries(columnFilters).every(([key, value]) =>
        String(txn[key as keyof typeof txn])
          .toLowerCase()
          .includes(value.toLowerCase())
      )
    );
  }, [transactions, columnFilters]);

  const paginatedTransactions = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, pageIndex, pageSize]);

  const columns = useMemo(
    () => [
      { header: "Transaction ID", accessorKey: "id" },
      { header: "Product Name", accessorKey: "product" },
      { header: "Amount", accessorKey: "amount" },
      { header: "Payment Method", accessorKey: "method" },
      { header: "Status", accessorKey: "status" },
    ],
    []
  );

  const table = useReactTable({
    data: paginatedTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-400 via-white to-purple-300 p-6">
      <h1 className="text-4xl font-extrabold text-gray-900 drop-shadow-lg mb-8 transform transition-all duration-300 hover:scale-105">
        Data Transaksi
      </h1>
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-3xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50">
        <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
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
    </div>
  );
}
