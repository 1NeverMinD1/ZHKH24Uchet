import client from "./client";
import { signAuth } from "../utils/ncalayer";

export const saveSession = (jwt, user) => {
  localStorage.setItem("token", jwt);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("user-updated"));
};

export const saveUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("user-updated"));
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("user-updated"));
};

export const errorCode = (err) =>
  err?.response?.data?.error?.message || err?.code || "DEFAULT";

export async function loginWithEds(locale) {
  const { data: challenge } = await client.get("/account/challenge");
  const cms = await signAuth(challenge.data, locale);
  const { data } = await client.post("/account/login", {
    nonce: challenge.nonce,
    cms,
  });
  saveSession(data.jwt, data.user);
  return data;
}

export async function fetchMe() {
  const { data } = await client.get("/account/me");
  saveUser(data.user);
  return data.user;
}

export async function updatePhone(phone) {
  const { data } = await client.put("/account/me", { phone });
  saveUser(data.user);
  return data.user;
}
