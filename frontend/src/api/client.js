const API_BASE = import.meta.env.VITE_API_URL || "https://belovecorp-absen.onrender.com";

export function getToken() {
  return localStorage.getItem("ba_token");
}

export function setSession(token, user) {
  localStorage.setItem("ba_token", token);
  localStorage.setItem("ba_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("ba_token");
  localStorage.removeItem("ba_user");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("ba_user") || "null");
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isLogin = path.startsWith("/auth/login");
  const token = getToken();
  if (token && !isLogin) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Koneksi dibatalkan. Coba login lagi.");
    }
    throw new Error("Tidak bisa terhubung ke server. Coba beberapa detik lagi.");
  }
  if (res.status === 401) {
    clearSession();
    if (!isLogin && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(", ")
      : detail || res.statusText;
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
  nextItem: () => request("/random-item/next"),
  submitAttendance: (formData) => request("/attendance", { method: "POST", body: formData }),
  myAttendance: () => request("/attendance/me"),
  addActivity: (deskripsi, tanggal) =>
    request("/activities", { method: "POST", body: JSON.stringify({ deskripsi, tanggal: tanggal || undefined }) }),
  updateActivity: (id, body) =>
    request(`/activities/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  myActivities: (date) => request(`/activities/me${date ? `?date=${date}` : ""}`),
  adminAttendances: (params = "") => request(`/admin/attendances${params}`),
  adminReport: (date) => request(`/admin/daily-report${date ? `?date=${date}` : ""}`),
  listReports: () => request("/admin/daily-reports"),
  updateReport: (konten_text, date) =>
    request(`/admin/daily-report${date ? `?date=${date}` : ""}`, {
      method: "PUT",
      body: JSON.stringify({ konten_text }),
    }),
  sendReport: (payload) =>
    request("/admin/daily-report/send", { method: "POST", body: JSON.stringify(payload) }),
  regenerateReport: (date) =>
    request(`/admin/daily-report/regenerate${date ? `?date=${date}` : ""}`, { method: "POST" }),
  items: () => request("/admin/random-items"),
  createItem: (body) => request("/admin/random-items", { method: "POST", body: JSON.stringify(body) }),
  updateItem: (id, body) =>
    request(`/admin/random-items/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteItem: (id) => request(`/admin/random-items/${id}`, { method: "DELETE" }),
  generateReportItemQr: (id) => request(`/admin/random-items/${id}/generate-qr`, { method: "POST" }),
  getReportItemQr: (id) => request(`/admin/random-items/${id}/qr`),
  stores: () => request("/admin/stores"),
  createStore: (body) => request("/admin/stores", { method: "POST", body: JSON.stringify(body) }),
  updateStore: (id, body) => request(`/admin/stores/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteStore: (id) => request(`/admin/stores/${id}`, { method: "DELETE" }),
  users: () => request("/admin/users"),
  createUser: (body) => request("/admin/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),
  schedules: () => request("/schedules"),
  mySchedules: () => request("/schedules/me"),
  adminSchedules: (userId) => request(`/admin/schedules${userId ? `?user_id=${userId}` : ""}`),
  workHoursRecap: (params) => request(`/admin/work-hours-recap${params}`),
  saveSchedule: (body) => request("/admin/schedules", { method: "POST", body: JSON.stringify(body) }),
  deleteSchedule: (id) => request(`/admin/schedules/${id}`, { method: "DELETE" }),
  manualAttendance: (params) => request(`/admin/attendance/manual${params}`, { method: "POST" }),
};

export function photoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}/uploads/${path}`;
}
