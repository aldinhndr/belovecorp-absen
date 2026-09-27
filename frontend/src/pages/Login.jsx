import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getStoredUser, getToken, setSession } from "../api/client";

import logoBelove from "../assets/belovecorp.png";

// --- Icons (DRY) ---
const EyeIcon = ({ show }) => (
  <svg
    className="w-5 h-5 text-neutral-400 hover:text-neutral-700 transition-colors duration-200"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.6}
  >
    {show ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a9.97 9.97 0 013.122-.513c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0z M3 3l18 18"
      />
    )}
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  useEffect(() => {
    const user = getStoredUser();
    const token = getToken();
    if (user && token) {
      navigate(user.role === "admin" ? "/admin" : "/", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.login(email, password);
      if (!data?.access_token || !data?.user) {
        setError("Login gagal. Respons server tidak valid.");
        return;
      }
      setSession(data.access_token, data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) {
      setError(err.message || "Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
      {/* Subtle background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-neutral-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neutral-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] border border-neutral-100 px-8 py-10 sm:px-10 sm:py-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src={logoBelove}
              alt="Belove Corp"
              className="h-10 object-contain"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Selamat Datang
            </h1>
            <p className="mt-2 text-sm text-neutral-500 font-light">
              Masuk untuk melanjutkan ke akun Anda
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-neutral-700 mb-2 tracking-wide uppercase">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MailIcon />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nama@email.com"
                  className="w-full pl-11 pr-4 py-3 text-sm text-neutral-900 bg-neutral-50/50 border border-neutral-200 rounded-xl placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-0 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-neutral-700 mb-2 tracking-wide uppercase">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 text-sm text-neutral-900 bg-neutral-50/50 border border-neutral-200 rounded-xl placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-0 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors duration-200 font-medium"
              >
                Lupa password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-neutral-400 mt-6 tracking-wide">
          © {new Date().getFullYear()} Belove Corp. All rights reserved.
        </p>
      </div>
    </div>
  );
}