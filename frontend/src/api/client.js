import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:1337/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const needsAuth =
    config.url.startsWith("/user") || config.url.startsWith("/company-card");
  if (token && needsAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    const hadToken = Boolean(config?.headers?.Authorization);
    const isCard = config?.url?.startsWith("/company-card");

    if (
      error.response?.status === 401 &&
      hadToken &&
      isCard &&
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
