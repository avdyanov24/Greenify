import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
      <div className="text-center px-4">
        <Leaf size={56} className="text-green-300 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-8">This patch of land is empty.</p>
        <Link
          to="/"
          className="inline-block bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-800 transition shadow-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
