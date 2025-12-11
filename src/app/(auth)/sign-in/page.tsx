"use client";

import { handleSignIn } from "@/lib/actions/signin";
import { useState, useTransition, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Separate component for the form that uses useSearchParams
const SignInForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const searchParams = useSearchParams();

  // Check for deactivation message on component mount
  useEffect(() => {
    if (searchParams?.get('deactivated') === 'true') {
      setError('Your account has been deactivated. Please contact your administrator.');
    }
  }, [searchParams]);

  const validateForm = (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const errors: { email?: string; password?: string } = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!email.includes("@")) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 relative overflow-hidden">
      {/* Animated Dark Green & Energy Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dark Green Energy Animations */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-green-800/15 to-emerald-900/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-32 w-80 h-80 bg-gradient-to-tr from-emerald-800/10 to-green-900/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-gradient-to-r from-green-900/8 to-emerald-800/12 rounded-full blur-3xl animate-slow-spin"></div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        {/* Dark Green Pipeline Graphics */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-green-800/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-emerald-800/20 to-transparent"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Premium Glassmorphism Card */}
          <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl shadow-green-900/20 p-8 space-y-8 relative overflow-hidden">
            {/* Card Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-800/10 to-emerald-800/10 rounded-3xl"></div>

            {/* Header Section */}
            <div className="relative text-center space-y-6">
              {/* Company Branding */}
              <div className="space-y-4">
                <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 bg-clip-text text-transparent tracking-tight">
                  CV HM JAYABERKAH
                </h1>
                <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-green-500 mx-auto rounded-full"></div>
                <h2 className="text-xl font-semibold text-white/90">
                  Enterprise Dashboard
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Access your centralized business operations. Secure. Reliable.
                  Efficient.
                </p>
              </div>
            </div>

            {/* Enhanced Error Message */}
            {error && (
              <div className="animate-in slide-in-from-top-5 duration-300 bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Authentication Failed</p>
                    <p className="text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Premium Form Section */}
            <form
              className="relative space-y-6"
              action={async (formData: FormData) => {
                // Clear previous errors
                setError(null);
                setFieldErrors({});

                // Validate form on client side first
                if (!validateForm(formData)) {
                  return;
                }

                startTransition(async () => {
                  const result = await handleSignIn(formData);

                  if (result.success) {
                    window.location.href = "/";
                  } else {
                    setError(result.message);
                  }
                });
              }}
            >
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
                    disabled={isPending}
                    className={`w-full h-12 px-4 bg-white/10 border rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed ${
                      fieldErrors.email
                        ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50"
                        : "border-white/20 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    }`}
                    onChange={() =>
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                    }
                  />
                  <div
                    className={`absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none ${
                      fieldErrors.email
                        ? "bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0"
                        : "bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-green-500/0"
                    }`}
                  ></div>
                </div>
                {fieldErrors.email && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Password
                </label>
                <div className="relative group">
                  <input
                    name="password"
                    placeholder="Enter your secure password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={isPending}
                    className={`w-full h-12 px-4 pr-12 bg-white/10 border rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed ${
                      fieldErrors.password
                        ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50"
                        : "border-white/20 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    }`}
                    onChange={() =>
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isPending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-400 transition-colors duration-200 disabled:opacity-50"
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
                  <div
                    className={`absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none ${
                      fieldErrors.password
                        ? "bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0"
                        : "bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-green-500/0"
                    }`}
                  ></div>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-2xl shadow-emerald-500/25 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-emerald-500/40 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isPending ? (
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
                      Signing In...
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
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      Access ERP Dashboard
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Security Badge */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                SSL Encrypted Connection
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main page component with Suspense boundary
const Page = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
};

export default Page;
