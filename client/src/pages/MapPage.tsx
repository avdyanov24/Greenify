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

  return (
    // Flex column: map on top, mobile info panel below — no overlap
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── MAP AREA ─────────────────────────────────────────── */}
      {/* min-h-0 lets flex-1 shrink below its content size so the panel below is visible */}
      <div className="flex-1 relative min-h-0">
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

        {/* ── DESKTOP overlays — inside the map, hidden on mobile ── */}
        <div className="absolute top-4 right-4 hidden md:block bg-white rounded-2xl shadow-lg border border-gray-100 p-4 w-72 z-[1000]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
              <TreePine size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900">Burgas Green Map</h3>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading hexes…</p>
          ) : hexes.length === 0 ? (
            <p className="text-gray-500 text-sm">No hexes yet — be the first to plant!</p>
          ) : (
            <p className="text-green-700 text-sm font-medium">{hexes.length} hexes claimed</p>
          )}

          {selectedHex && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="font-semibold text-sm text-gray-800">
                {selectedHex.plantCount} plants in this hex
              </p>
              {selectedHex.posts?.map((p) => (
                <div key={p.id} className="mt-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                  {p.title}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Link
              to="/create-post"
              className="flex items-center justify-center gap-2 w-full bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-800 transition"
            >
              <TreePine size={14} /> Plant Here
            </Link>
          </div>
        </div>

        {/* Desktop legend */}
        <div className="absolute bottom-4 left-4 hidden md:block bg-white rounded-2xl shadow-lg border border-gray-100 p-4 z-[1000]">
          <h4 className="font-bold text-sm text-gray-800 mb-2">Plant Density</h4>
          <div className="space-y-1.5 text-xs">
            {LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md shrink-0" style={{ backgroundColor: item.color, border: "1px solid #86efac" }} />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE PANEL — below the map, never overlapping it ── */}
      <div className="md:hidden shrink-0 bg-white border-t border-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Status text */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <p className="text-sm text-gray-500">Loading hexes…</p>
            ) : selectedHex ? (
              <p className="text-sm font-semibold text-gray-800 truncate">
                {selectedHex.plantCount} plant{selectedHex.plantCount !== 1 ? "s" : ""} in this hex
              </p>
            ) : hexes.length === 0 ? (
              <p className="text-sm text-gray-500">No hexes yet — be the first!</p>
            ) : (
              <p className="text-sm text-green-700 font-medium">{hexes.length} hexes claimed</p>
            )}

            {/* Mini legend */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color, border: "1px solid #86efac" }} />
                  <span className="text-[10px] text-gray-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plant CTA */}
          <Link
            to="/create-post"
            className="shrink-0 flex items-center gap-1.5 bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-800 transition shadow-sm"
          >
            <TreePine size={14} /> Plant
          </Link>
        </div>
      </div>
    </div>
  );
}
