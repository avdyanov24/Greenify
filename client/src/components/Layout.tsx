import { Outlet } from "react-router-dom";
import { useState, useCallback } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={handleSidebarClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar onClose={handleSidebarClose} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} mobileMenuOpen={sidebarOpen} />
        <main className="flex-1 overflow-auto bg-[#f8faf9]">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
