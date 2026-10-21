import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:1337/api",
});

const AUTH_PREFIXES = [
  "/user",
  "/company-card",
  "/history",
  "/auth/change-password",
];
const RETRY_PREFIXES = ["/company-card", "/history"];

const startsWithAny = (url, prefixes) =>
  prefixes.some((prefix) => url.startsWith(prefix));

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && startsWithAny(config.url, AUTH_PREFIXES)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    const hadToken = Boolean(config?.headers?.Authorization);
    const retryable = config?.url && startsWithAny(config.url, RETRY_PREFIXES);

    if (
      error.response?.status === 401 &&
      hadToken &&
      retryable &&
      !config._retried
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("user-updated"));
      config._retried = true;
      return client(config);
    }

    return Promise.reject(error);
  },
);

export default client;
