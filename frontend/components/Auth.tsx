// frontend/components/Auth.tsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { BookOpen } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setStudentId, setToken } = useAuth(); // Only need setters from context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/signin";
      const payload: any = { email, password };
      if (isSignUp) {
        payload.fullName = fullName;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Authentication failed");
      }

      // Store token and user info
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("studentId", data.student_id);
      
      // Update context
      setToken(data.access_token);
      setStudentId(data.student_id);

      console.log("Auth successful:", data);
    } catch (err: unknown) {
      console.error("Auth error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <BookOpen className="w-12 h-12 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Smart Campus</h1>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 font-medium hover:underline">
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}