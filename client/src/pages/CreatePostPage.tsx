import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, MapPin, CheckCircle, AlertCircle, Leaf } from "lucide-react";
import { apiClient } from "../services/api";

const STEPS = [
  { label: "Info", desc: "Plant details" },
  { label: "Photo 1", desc: "Seed/seedling only" },
  { label: "Photo 2", desc: "Being placed in soil" },
  { label: "Photo 3", desc: "Buried & ready to water" },
  { label: "Submit", desc: "Review & submit" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plantType, setPlantType] = useState("tree");
  const [images, setImages] = useState<string[]>(["", "", ""]);
  const [previews, setPreviews] = useState<string[]>(["", "", ""]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ gpEarned: number; xpEarned: number; isDuplicate: boolean } | null>(null);
  const [error, setError] = useState("");
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const captureGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        // Fallback to Burgas center for demo
        setGps({ lat: 42.5069, lng: 27.4626 });
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleImageSelect = async (index: number, file: File) => {
    const b64 = await fileToBase64(file);
    const newImages = [...images];
    const newPreviews = [...previews];
    newImages[index] = b64;
    newPreviews[index] = URL.createObjectURL(file);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!gps) return setError("GPS location required");
    if (images.some((img) => !img)) return setError("All 3 photos are required");

    setSubmitting(true);
    setError("");
    try {
      const data = await apiClient.createPost({
        title,
        description,
        plantType,
        latitude: gps.lat,
        longitude: gps.lng,
        images,
      });
      setResult({ gpEarned: data.gpEarned, xpEarned: data.xpEarned, isDuplicate: data.isDuplicate });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          {result.isDuplicate ? (
            <AlertCircle size={56} className="text-yellow-500 mx-auto mb-4" />
          ) : (
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-2">
            {result.isDuplicate ? "Post Held for Review" : "Post Published!"}
          </h2>
          {result.isDuplicate ? (
            <p className="text-gray-600 mb-6">Your post was flagged by our AI system and is pending moderator review.</p>
          ) : (
            <p className="text-gray-600 mb-6">Your planting was verified and your hex has been claimed!</p>
          )}
          <div className="flex justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">+{result.gpEarned}</p>
              <p className="text-sm text-gray-500">Green Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">+{result.xpEarned}</p>
              <p className="text-sm text-gray-500">XP</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              View Feed
            </button>
            <button
              onClick={() => navigate("/map")}
              className="flex-1 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800"
            >
              View Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Plant Something New</h1>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((_step, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition ${i <= step ? "bg-green-600" : "bg-gray-200"}`}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-xl font-bold mb-1">{STEPS[step].label}</h2>
        <p className="text-gray-500 text-sm mb-6">{STEPS[step].desc}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plant Type</label>
              <select
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="tree">Tree</option>
                <option value="flower">Flower / Shrub</option>
                <option value="grass">Grass / Ground Cover</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Oak tree in Troikata park"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about what you planted..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GPS Location *</label>
              {gps ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <MapPin size={18} />
                  <span>{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>
                  <button onClick={captureGps} className="text-xs text-gray-500 underline ml-2">Recapture</button>
                </div>
              ) : (
                <button
                  onClick={captureGps}
                  disabled={gpsLoading}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm text-gray-700 transition"
                >
                  <MapPin size={18} />
                  {gpsLoading ? "Getting location..." : "Capture GPS Location"}
                </button>
              )}
            </div>
          </div>
        )}

        {step >= 1 && step <= 3 && (
          <div>
            <input
              ref={fileRefs[step - 1]}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageSelect(step - 1, e.target.files[0]);
              }}
            />

            {previews[step - 1] ? (
              <div className="relative">
                <img
                  src={previews[step - 1]}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => fileRefs[step - 1].current?.click()}
                  className="absolute bottom-3 right-3 bg-white text-sm px-3 py-1.5 rounded-lg shadow hover:bg-gray-50"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRefs[step - 1].current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-green-400 hover:bg-green-50 transition"
              >
                <Upload size={40} className="text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Click to upload photo</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG, HEIC supported</p>
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">{title}</p>
              <p className="text-sm text-gray-500 capitalize">{plantType}</p>
              {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => p ? (
                <img key={i} src={p} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
              ) : (
                <div key={i} className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">Missing</div>
              ))}
            </div>
            {gps ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <MapPin size={16} />
                <span>{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>
              </div>
            ) : (
              <p className="text-red-500 text-sm">GPS location not captured</p>
            )}
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
              <Leaf size={16} className="inline mr-1" />
              You'll earn Green Points based on your zone's plant density!
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step === 0 && !title.trim()) return setError("Title is required");
              if (step >= 1 && step <= 3 && !images[step - 1]) return setError("Please upload a photo");
              setError("");
              if (step < 4) setStep(step + 1);
              else handleSubmit();
            }}
            disabled={submitting}
            className="flex-1 px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition font-medium"
          >
            {step < 4 ? "Continue" : submitting ? "Submitting..." : "Plant It!"}
          </button>
        </div>
      </div>
    </div>
  );
}
