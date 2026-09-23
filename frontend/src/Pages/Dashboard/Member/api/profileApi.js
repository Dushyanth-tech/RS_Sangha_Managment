import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth

export const getProfileWizard = () =>
  api.get(`/me/profile-wizard`);

export const uploadProfilePhoto = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/me/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const saveProfileWizard = (payload) =>
  api.patch(`/me/complete-profile`, payload);

export const getErrorMessage = (error) => {
  if (!error?.response) return "Network error — please check your connection and try again.";
  return error.response.data?.detail || "Something went wrong. Please try again.";
};

export const getMyPhoto = () =>
  api.get(`/me/photo`, { responseType: "blob" });

export const getMyPanImage = () =>
  api.get(`/me/pan-image`, { responseType: "blob" });

export const getMyIdProofImage = () =>
  api.get(`/me/id-proof-image`, { responseType: "blob" });