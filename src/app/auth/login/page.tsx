"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(true);
  const router = useRouter();
  const { login } = useAuth();

  const validateInputs = () => {
    if (!username || !password) {
      setError("Username dan Password tidak boleh kosong.");
      return false;
    }

    if (username.length < 4) {
      setError("Username harus minimal 4 karakter.");
      return false;
    }

    if (password.length < 6) {
      setError("Password harus minimal 6 karakter.");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    try {
      const response = await axios.post(
        "https://login-bir3msoyja-et.a.run.app",
        { username, password }
      );
      // console.log("API Response:", JSON.stringify(response.data));

      login(response.data);

      router.push("/dashboard");
    } catch (err) {
      setError("Login gagal. Periksa kembali username dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-center h-screen transition-all duration-500 ${
        isLightTheme
          ? "bg-gradient-to-br from-blue-300 via-white to-purple-300"
          : "bg-gradient-to-br from-gray-900 to-gray-800"
      }`}
    >
      <div
        className={`p-8 rounded-2xl shadow-2xl w-96 transition-all duration-300 transform hover:scale-105 ${
          isLightTheme
            ? "bg-white shadow-blue-500/50"
            : "bg-gray-700 hover:shadow-blue-500/50"
        }`}
      >
        <h1
          className={`text-3xl font-bold text-center drop-shadow-lg ${
            isLightTheme ? "text-gray-900" : "text-white"
          }`}
        >
          Masuk
        </h1>
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Masukkan Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 ${
                isLightTheme
                  ? "bg-gray-200 text-gray-900 border-gray-400"
                  : "bg-gray-800 text-white border-gray-600"
              } border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-blue-400`}
              required
            />
          </div>
          <div className="relative mt-4">
            <input
              type="password"
              placeholder="Masukkan Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 ${
                isLightTheme
                  ? "bg-gray-200 text-gray-900 border-gray-400"
                  : "bg-gray-800 text-white border-gray-600"
              } border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-blue-400`}
              required
            />
          </div>
          {error && (
            <p className="mt-3 text-red-500 text-center font-semibold">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-6 p-3 rounded-lg font-semibold text-lg shadow-lg transform transition-all duration-200 ${
              loading
                ? "bg-gray-500 cursor-not-allowed text-white"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-xl text-white"
            }`}
          >
            {loading ? "Sedang masuk..." : "Masuk"}
          </button>
        </form>
        <button
          onClick={() => setIsLightTheme(!isLightTheme)}
          className="w-full mt-4 p-3 rounded-lg font-semibold shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-400 via-white to-purple-400 text-gray-900 hover:opacity-80"
        >
          {isLightTheme ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang"}
        </button>
      </div>
    </div>
  );
};

export default Login;
