import client from "./client";

const get = async (path, params) => {
  const { data } = await client.get(path, { params });
  return data;
};

export const fetchRegistryCompanies = ({ type, q, page } = {}) =>
  get("/registry/companies", {
    type: type || undefined,
    q: q || undefined,
    page: page || 1,
  });

export const fetchRegistryCompany = (slug) =>
  get(`/registry/company/${encodeURIComponent(slug)}`);

export const fetchRegistryHouses = ({ q, page } = {}) =>
  get("/registry/houses", { q: q || undefined, page: page || 1 });

export const fetchRegistryHouse = (addressId) =>
  get(`/registry/house/${encodeURIComponent(addressId)}`);

export const fetchRegistryComplexes = () => get("/registry/complexes");

export const fetchRegistryComplex = (slug) =>
  get(`/registry/complex/${encodeURIComponent(slug)}`);
