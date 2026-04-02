import axios from "axios";

// Vite env override (recommended): add to `frontend/.env`
// VITE_API_BASE_URL=http://localhost:5000
const DEFAULT_BASE_URL = "http://localhost:5000";

export const API_BASE_URL =
	(typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
	DEFAULT_BASE_URL;

export const api = axios.create({
	baseURL: `${API_BASE_URL}/api`,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("ip_token");
	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export function getApiErrorMessage(error) {
	return (
		error?.response?.data?.error ||
		error?.response?.data?.message ||
		error?.message ||
		"Something went wrong"
	);
}

// ---- Auth ----
export async function login(phone, pin) {
	const res = await api.post("/auth/login", { phone, pin });
	return res.data;
}

export async function register(payload) {
	// payload: { name, email, phone, pin? }
	const res = await api.post("/auth/register", payload);
	return res.data;
}

export async function setPin(phone, pin) {
	const res = await api.post("/auth/set-pin", { phone, pin });
	return res.data;
}

// ---- Inventory (protected) ----
export async function getInventory(params) {
	const res = await api.get("/inventory", { params });
	return res.data;
}

export async function createInventoryItem(payload) {
	const res = await api.post("/inventory", payload);
	return res.data;
}

export async function updateInventoryItem(id, payload) {
	const res = await api.put(`/inventory/${id}`, payload);
	return res.data;
}

export async function deleteInventoryItem(id) {
	const res = await api.delete(`/inventory/${id}`);
	return res.data;
}

// ---- Transactions (protected) ----
export async function getTransactions(params) {
	const res = await api.get("/transactions", { params });
	return res.data;
}

export async function createTransaction(payload) {
	const res = await api.post("/transactions", payload);
	return res.data;
}

// ---- Udhaar (protected) ----
export async function getUdhaar(params) {
	const res = await api.get("/udhaar", { params });
	return res.data;
}

export async function createUdhaar(payload) {
	const res = await api.post("/udhaar", payload);
	return res.data;
}

export async function settleUdhaar(id, payload) {
	const res = await api.patch(`/udhaar/${id}/paid`, payload);
	return res.data;
}

export async function sendUdhaarReminder(id, payload) {
	const res = await api.post(`/udhaar/${id}/reminder`, payload);
	return res.data;
}

// ---- Dashboard (protected) ----
export async function getDashboardSummary(params) {
	const res = await api.get("/dashboard/summary", { params });
	return res.data;
}

