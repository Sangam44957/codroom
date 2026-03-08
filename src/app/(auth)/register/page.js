"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(field) {
    return (e) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user types
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
      if (apiError) setApiError("");
    };
  }

  function validate() {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error);
        return;
      }

      // Success — redirect to dashboard
      router.push("/dashboard");
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CodRoom</h1>
          <p className="text-gray-400">Create your interviewer account</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange("name")}
              error={errors.name}
            />

            <Input
              label="Email"
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={handleChange("email")}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange("password")}
              error={errors.password}
            />

            {apiError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm">{apiError}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          <p className="text-gray-400 text-center mt-6 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}