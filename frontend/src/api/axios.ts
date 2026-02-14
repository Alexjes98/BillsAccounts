import axios from "axios";

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a response interceptor to handle errors globally if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can handle global errors here, e.g., redirect to login on 401
    console.error("API Error:", error);
    return Promise.reject(error);
  },
);

import { fetchAuthSession } from "aws-amplify/auth";

api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // User is likely not signed in, which is fine for public/free routes
  }
  return config;
});

export default api;
