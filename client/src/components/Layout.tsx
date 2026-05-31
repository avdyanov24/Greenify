import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">

      {/* ── Mobile backdrop ─────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar wrapper ───────────────────────────────────
          Mobile : fixed off-canvas, z-50 (above Leaflet's highest ~800 internal z-index)
          Desktop: static in-flow, NO transform (transform creates stacking context
                   which causes the sidebar to paint behind the map) */}
      <div
        className={[
          // mobile positioning
          "fixed inset-y-0 left-0 z-50",
          // desktop: back into normal flow, remove z and transform entirely
          "md:static md:z-auto md:transform-none",
          // slide animation only on mobile
          "transition-transform duration-300 ease-in-out",
          // open/closed state — md:transform-none overrides the translate on desktop
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header gets its own stacking context so it always sits above the map */}
        <div className="relative z-10 shrink-0">
          <Header
            onMenuClick={() => setSidebarOpen((v) => !v)}
            mobileMenuOpen={sidebarOpen}
          />
        </div>

        {/* min-h-0 is required: without it flex children can't constrain to the
            available height, so h-full inside MapPage won't fill correctly */}
        <main className="flex-1 min-h-0 overflow-auto bg-[#f8faf9]">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
