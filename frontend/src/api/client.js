import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:1337/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const needsAuth = config.url.startsWith("/user");
  if (token && needsAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
