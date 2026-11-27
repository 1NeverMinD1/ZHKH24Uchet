import client from "./client";

const get = async (path, params) => {
  const { data } = await client.get(path, { params });
  return data;
};

export const fetchRegistryCompanies = ({
  type,
  q,
  page,
  status,
  city,
  district,
  houses,
  sort,
} = {}) =>
  get("/registry/companies", {
    type: type || undefined,
    q: q || undefined,
    status: status || undefined,
    city: city || undefined,
    district: district || undefined,
    houses: houses || undefined,
    sort: sort || undefined,
    page: page || 1,
  });

export const fetchRegistryCompany = (slug) =>
  get(`/registry/company/${encodeURIComponent(slug)}`);

export const fetchRegistryHouses = ({
  q,
  page,
  city,
  district,
  managed,
  complex,
  sort,
} = {}) =>
  get("/registry/houses", {
    q: q || undefined,
    city: city || undefined,
    district: district || undefined,
    managed: managed || undefined,
    complex: complex ? "1" : undefined,
    sort: sort || undefined,
    page: page || 1,
  });

export const fetchRegistryHouse = (addressId) =>
  get(`/registry/house/${encodeURIComponent(addressId)}`);

export const fetchRegistryComplexes = ({
  q,
  page,
  city,
  district,
  multi,
} = {}) =>
  get("/registry/complexes", {
    q: q || undefined,
    city: city || undefined,
    district: district || undefined,
    multi: multi ? "1" : undefined,
    page: page || 1,
  });

export const fetchRegistryComplex = (slug) =>
  get(`/registry/complex/${encodeURIComponent(slug)}`);
