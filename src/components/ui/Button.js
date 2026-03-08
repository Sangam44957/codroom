"use client";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  fullWidth = false,
  disabled = false,
  loading = false,
}) {
  const baseStyles =
    "px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center";

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800",
    secondary:
      "bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-800",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {loading ? (
        <svg
          className="animate-spin h-5 w-5 mr-2"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : null}
      {loading ? "Please wait..." : children}
    </button>
  );
}