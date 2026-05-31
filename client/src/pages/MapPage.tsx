import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Popup, useMap } from "react-leaflet";
import { cellToBoundary, latLngToCell, gridDisk } from "h3-js";
import "leaflet/dist/leaflet.css";
import { apiClient } from "../services/api";
import { Link } from "react-router-dom";
import { TreePine } from "lucide-react";

interface HexData {
  h3Index: string;
  plantCount: number;
  userId: string | null;
  userName?: string | null;
  organizationId: string | null;
  organizationName?: string | null;
}

interface HexDetails {
  h3Index: string;
  plantCount: number;
  userId: string | null;
  posts?: { id: string; title: string; user: { displayName: string } }[];
}

function hexColor(plantCount: number): string {
  if (plantCount === 0) return "#d1fae5";
  if (plantCount <= 10) return "#6ee7b7";
  if (plantCount <= 30) return "#34d399";
  return "#059669";
}

const BURGAS_CENTER: [number, number] = [42.5069, 27.4626];
const DEMO_RESOLUTION = 9;

const LEGEND = [
  { color: "#d1fae5", label: "Unclaimed" },
  { color: "#6ee7b7", label: "Sparse (1–10)" },
  { color: "#34d399", label: "Moderate (11–30)" },
  { color: "#059669", label: "Dense (31+)" },
];

function DemoHexLayer() {
  const map = useMap();
  const center = map.getCenter();
  const centerH3 = latLngToCell(center.lat, center.lng, DEMO_RESOLUTION);
  const neighborRing = gridDisk(centerH3, 6);
  return (
    <>
      {neighborRing.map((h3Index) => {
        const boundary = cellToBoundary(h3Index);
        const positions: [number, number][] = boundary.map(([lat, lng]) => [lat, lng]);
        return (
          <Polygon
            key={h3Index}
            positions={positions}
            pathOptions={{ color: "#86efac", fillColor: "#dcfce7", fillOpacity: 0.3, weight: 0.5 }}
          />
        );
      })}
    </>
  );
}

export default function MapPage() {
  const [hexes, setHexes] = useState<HexData[]>([]);
  const [selectedHex, setSelectedHex] = useState<HexDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getMapData()
      .then((data) => { if (data.hexes) setHexes(data.hexes); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleHexClick = async (h3Index: string) => {
    try {
      const details = await apiClient.getHexDetails(h3Index);
      setSelectedHex(details);
    } catch {
      setSelectedHex({ h3Index, plantCount: 0, userId: null, posts: [] });
    }
  };

  const hexCount = loading ? "Loading…" : `${hexes.length} hexes claimed`;

  return (
    /**
     * Outer wrapper: always flex.
     *  - Desktop (md+): row — info panel on left, map fills remaining space
     *  - Mobile       : column — map on top, info panel below
     *
     * Using document-flow panels (not absolute overlays) eliminates all
     * z-index / stacking-context conflicts with Leaflet.
     */
    <div className="h-full flex flex-col md:flex-row overflow-hidden">

      {/* ────────────────────────────────────────────────────────
          DESKTOP INFO PANEL  (left column, md+ only)
      ──────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center shrink-0">
              <TreePine size={15} className="text-white" />
            </div>
            <h2 className="font-bold text-gray-900">Burgas Green Map</h2>
          </div>

          {/* Hex count */}
          <p className={`text-sm mb-1 ${loading ? "text-gray-400" : "text-green-700 font-medium"}`}>
            {hexCount}
          </p>

          {/* Selected hex info */}
          {selectedHex && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="font-semibold text-sm text-gray-800">
                {selectedHex.plantCount} plant{selectedHex.plantCount !== 1 ? "s" : ""} in this hex
              </p>
              {selectedHex.posts && selectedHex.posts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedHex.posts.map((p) => (
                    <div key={p.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      {p.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plant CTA */}
          <Link
            to="/create-post"
            className="flex items-center justify-center gap-2 w-full mt-5 bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-800 transition shadow-sm"
          >
            <TreePine size={14} /> Plant Here
          </Link>

          {/* Legend */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Plant Density
            </p>
            <div className="space-y-2">
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-gray-600">
                  <div
                    className="w-4 h-4 rounded-md shrink-0"
                    style={{ backgroundColor: item.color, border: "1px solid #86efac" }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────
          MAP  (fills remaining space at all breakpoints)
      ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 min-w-0">
        <MapContainer
          center={BURGAS_CENTER}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hexes.length === 0 && <DemoHexLayer />}
          {hexes.map((hex) => {
            const boundary = cellToBoundary(hex.h3Index);
            const positions: [number, number][] = boundary.map(([lat, lng]) => [lat, lng]);
            return (
              <Polygon
                key={hex.h3Index}
                positions={positions}
                pathOptions={{
                  color: "#15803d",
                  fillColor: hexColor(hex.plantCount),
                  fillOpacity: 0.7,
                  weight: 1,
                }}
                eventHandlers={{ click: () => handleHexClick(hex.h3Index) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{hex.organizationName || hex.userName || "Unclaimed"}</p>
                    <p>{hex.plantCount} plant{hex.plantCount !== 1 ? "s" : ""}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>

      {/* ────────────────────────────────────────────────────────
          MOBILE INFO PANEL  (bottom strip, mobile only)
          In document flow — never overlaps the map.
      ──────────────────────────────────────────────────────── */}
      <div className="md:hidden shrink-0 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.07)]">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {selectedHex ? (
              <p className="text-sm font-semibold text-gray-800 truncate">
                {selectedHex.plantCount} plant{selectedHex.plantCount !== 1 ? "s" : ""} in this hex
              </p>
            ) : (
              <p className={`text-sm ${loading ? "text-gray-400" : "text-green-700 font-medium"}`}>
                {hexCount}
              </p>
            )}
            {/* Mini legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color, border: "1px solid #86efac" }}
                  />
                  <span className="text-[10px] text-gray-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/create-post"
            className="shrink-0 flex items-center gap-1.5 bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-800 transition"
          >
            <TreePine size={14} /> Plant
          </Link>
        </div>
      </div>
    </div>
  );
}
