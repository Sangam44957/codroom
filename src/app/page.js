import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">CodRoom</h1>
        <p className="text-gray-400 text-xl mb-8">
          Technical interviews, Powered by AI.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all border border-gray-700"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}