import axios from "axios";

const API_BASE = "http://localhost:8000";

const token = () => localStorage.getItem("access_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

export const getProfileWizard = () =>
  axios.get(`${API_BASE}/me/profile-wizard`, { headers: authHeaders() });

export const uploadProfilePhoto = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axios.post(`${API_BASE}/me/photo`, formData, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });
};

export const saveProfileWizard = (payload) =>
  axios.patch(`${API_BASE}/me/complete-profile`, payload, { headers: authHeaders() });

export const getErrorMessage = (error) => {
  if (!error?.response) return "Network error — please check your connection and try again.";
  return error.response.data?.detail || "Something went wrong. Please try again.";
};
