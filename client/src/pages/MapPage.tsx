import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Popup, useMap } from "react-leaflet";
import { cellToBoundary, latLngToCell, gridDisk } from "h3-js";
import "leaflet/dist/leaflet.css";
import { apiClient } from "../services/api";
import { Link } from "react-router-dom";

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

// Burgas center with surrounding demo hexes for visual
const BURGAS_CENTER: [number, number] = [42.5069, 27.4626];
const DEMO_RESOLUTION = 9;

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
    apiClient.getMapData()
      .then((data) => {
        if (data.hexes) setHexes(data.hexes);
      })
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
    <div className="h-screen w-full relative">
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

        {/* Show faint demo grid at Burgas center */}
        {hexes.length === 0 && <DemoHexLayer />}

        {/* Real claimed hexes */}
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

      {/* Sidebar */}
      <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg p-4 w-72 z-[1000]">
        <h3 className="font-bold text-lg mb-3 text-green-700">Burgas Green Map</h3>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading hexes...</p>
        ) : hexes.length === 0 ? (
          <p className="text-gray-500 text-sm">No hexes claimed yet — be the first to plant!</p>
        ) : (
          <p className="text-gray-600 text-sm">{hexes.length} hexes claimed</p>
        )}

        {selectedHex && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="font-semibold text-sm">{selectedHex.plantCount} plants in this hex</p>
            {selectedHex.posts && selectedHex.posts.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedHex.posts.map((p) => (
                  <div key={p.id} className="text-xs text-gray-600">{p.title}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <Link
            to="/create-post"
            className="block w-full bg-green-700 text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition shadow-sm"
          >
            + Plant Here
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-4 z-[1000]">
        <h4 className="font-bold text-sm mb-2">Plant Density</h4>
        <div className="space-y-1.5 text-xs">
          {[
            { color: "#d1fae5", label: "Unclaimed" },
            { color: "#6ee7b7", label: "Sparse (1–10)" },
            { color: "#34d399", label: "Moderate (11–30)" },
            { color: "#059669", label: "Dense (31+)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color, border: "1px solid #86efac" }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
