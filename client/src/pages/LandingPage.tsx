import { Link } from "react-router-dom";
import { Leaf, MapPin, TreePine, Star, Users } from "lucide-react";

const sponsors = [
  "EcoVerde Solutions",
  "BioNest Bulgaria",
  "GreenTech Capital",
  "Black Sea Eco",
  "Sunny Beach Resorts",
  "Chamber of Commerce",
  "SolarGrid BG",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="text-green-700" size={28} />
            <h1 className="text-2xl font-bold text-green-700 font-display">Greenify</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/map" className="text-gray-700 hover:text-green-600 font-medium">
              Map
            </Link>
            <Link to="/login" className="text-gray-700 hover:text-gray-900">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <section className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Leaf size={16} />
            Burgas Civic Eco-Platform
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Green Your City,<br />Earn Rewards
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Document your tree plantings with 3 photos, claim hexagonal territory on Burgas's live map,
            and earn Green Points through our community-driven platform.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-800 transition shadow-sm"
            >
              Start Planting
            </Link>
            <Link
              to="/map"
              className="border border-green-700 text-green-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-50 transition"
            >
              View Map
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            { icon: <MapPin size={28} className="text-green-600" />, title: "Claim Territory", desc: "Plant a tree and claim a hex on Burgas's live map" },
            { icon: <TreePine size={28} className="text-green-600" />, title: "Document Plants", desc: "3-photo verification: seed, planting, and buried" },
            { icon: <Star size={28} className="text-yellow-500" />, title: "Earn Rewards", desc: "Collect Green Points from posts, endorsements, and tasks" },
            { icon: <Users size={28} className="text-blue-500" />, title: "Build Community", desc: "Endorse others, join organizations, hire workers" },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl shadow-md p-6 text-center">
              <div className="flex justify-center mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="bg-green-800 rounded-2xl p-12 text-white text-center mb-20">
          <h3 className="text-3xl font-bold mb-4">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            {[
              { step: "1", title: "Plant & Document", desc: "Go outside, plant a tree or flower, and upload 3 ordered photos as proof" },
              { step: "2", title: "Claim Your Hex", desc: "GPS confirms your location and claims the nearest hexagon on the city map" },
              { step: "3", title: "Earn & Grow", desc: "Get endorsed by the community, earn Green Points, level up, and unlock achievements" },
            ].map((s) => (
              <div key={s.step}>
                <div className="w-12 h-12 bg-white text-green-800 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  {s.step}
                </div>
                <h4 className="font-bold text-lg mb-2">{s.title}</h4>
                <p className="text-green-100 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <h3 className="text-2xl font-bold text-center mb-3">Backed by</h3>
          <p className="text-center text-gray-500 mb-10 text-sm">Our founding sponsors making Burgas greener</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {sponsors.map((name) => (
              <div
                key={name}
                className="bg-white border border-gray-200 rounded-xl h-20 flex items-center justify-center p-3 text-center text-xs font-medium text-gray-600 shadow-sm hover:shadow-md transition"
              >
                {name}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Leaf size={20} />
            <span className="font-bold">Greenify</span>
          </div>
          <p className="text-gray-400 text-sm">
            &copy; 2026 Greenify. Making Burgas greener, one tree at a time.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/map" className="hover:text-white">Map</Link>
            <Link to="/login" className="hover:text-white">Login</Link>
            <Link to="/register" className="hover:text-white">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
