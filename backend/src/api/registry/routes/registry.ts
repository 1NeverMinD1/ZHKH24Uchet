export default {
  routes: [
    {
      method: "GET",
      path: "/registry/companies",
      handler: "registry.companies",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/registry/company/:slug",
      handler: "registry.company",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/registry/houses",
      handler: "registry.houses",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/registry/house/:id",
      handler: "registry.house",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/registry/complexes",
      handler: "registry.complexes",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/registry/complex/:slug",
      handler: "registry.complex",
      config: { auth: false },
    },
  ],
};
