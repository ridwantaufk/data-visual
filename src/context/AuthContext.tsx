"use client";
import { createContext, useContext, useState } from "react";

interface UserData {
  [key: string]: any; // Bisa menyimpan objek dinamis dari API
}

interface AuthContextType {
  user: UserData | null;
  login: (data: UserData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);

  const login = (data: UserData) => {
    // console.log("data : ", data);
    setUser(data); // Simpan data transaksi user dari API
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
