import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    // Always flex-row. Sidebar is fixed (off-canvas) on mobile, static on desktop.
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">

      {/* Mobile backdrop — sits between content and sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar wrapper
          Mobile : fixed, slides in from left, z-50 (above Leaflet's highest pane at ~800)
          Desktop: static, always visible, no z-index needed */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50",       // mobile: off-canvas overlay
          "md:static md:z-auto",                 // desktop: in-flow, no z shenanigans
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* Right-side column: header + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header must sit above the map — give it a stacking context */}
        <div className="relative z-10 shrink-0">
          <Header
            onMenuClick={() => setSidebarOpen((v) => !v)}
            mobileMenuOpen={sidebarOpen}
          />
        </div>

        {/* min-h-0 is critical: without it flex-1 children can't constrain their
            height, so h-full on MapPage would not work correctly */}
        <main className="flex-1 min-h-0 overflow-auto bg-[#f8faf9]">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
