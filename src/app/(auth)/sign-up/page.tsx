"use client";

import { signUp } from "@/lib/action";
import Link from "next/link";
import { useState } from "react";

const Page = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
      {/* Animated Oil & Energy Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Oil Drop Animations */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-orange-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-32 w-80 h-80 bg-gradient-to-tr from-yellow-500/15 to-amber-600/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-gradient-to-r from-orange-400/10 to-red-500/15 rounded-full blur-3xl animate-slow-spin"></div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        {/* Oil Pipeline Graphics */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Premium Glassmorphism Card */}
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-amber-500/5 p-8 space-y-8 relative overflow-hidden">
            {/* Card Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-3xl"></div>

            {/* Header Section */}
            <div className="relative text-center space-y-6">
              {/* Company Branding */}
              <div className="space-y-4">
                <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent tracking-tight">
                  CV HM JAYABERKAH
                </h1>
                <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full"></div>
                <h2 className="text-xl font-semibold text-white/90">
                  Enterprise Resource Planning
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Join our integrated business management system. Streamline
                  operations, maximize efficiency.
                </p>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="animate-in slide-in-from-top-5 duration-300 bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Account created successfully! Redirecting to sign in...
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="animate-in slide-in-from-top-5 duration-300 bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Premium Form Section */}
            <form
              className="relative space-y-6"
              onSubmit={async e => {
                e.preventDefault();
                setIsLoading(true);
                setError(null);
                setSuccess(false);

                const formData = new FormData(e.currentTarget);

                try {
                  const res = await signUp(formData);
                  if (res.success) {
                    setSuccess(true);
                    setTimeout(() => {
                      window.location.href = "/sign-in";
                    }, 2000);
                  } else {
                    setError(
                      res.message || "Sign up failed. Please try again."
                    );
                  }
                } catch (er) {
                  setError(
                    `{"An unexpected error occurred. Please try again."} ${er}`
                  );
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Full Name
                </label>
                <div className="relative group">
                  <input
                    name="name"
                    placeholder="Enter your full name"
                    type="text"
                    required
                    autoComplete="name"
                    disabled={isLoading}
                    className="w-full h-12 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-orange-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Corporate Email
                </label>
                <div className="relative group">
                  <input
                    name="email"
                    placeholder="your.email@company.com"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full h-12 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-orange-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Secure Password
                </label>
                <div className="relative group">
                  <input
                    name="password"
                    placeholder="Create a strong password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="w-full h-12 px-4 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-400 transition-colors duration-200 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-orange-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-2xl shadow-amber-500/25 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-amber-500/40 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Create ERP Account
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Footer */}
            <div className="relative text-center pt-6 border-t border-white/10">
              <p className="text-gray-400 text-sm mb-4">
                Already managing operations with us?
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium transition-colors duration-300 group"
              >
                <svg
                  className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Sign In to Dashboard
              </Link>
            </div>

            {/* Security Badge */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-7-4zM8.01 11.07L7 10.05 5.58 11.46 8.01 13.9 15.43 6.48 14.01 5.07l-6 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Enterprise Security Enabled
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
