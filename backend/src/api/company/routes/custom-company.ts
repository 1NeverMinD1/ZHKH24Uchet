export default {
  routes: [
    {
      method: "GET",
      path: "/company-search",
      handler: "company.search",
    },
    {
      method: "GET",
      path: "/company-card/:bin",
      handler: "company.card",
    },
    {
      method: "GET",
      path: "/company-list",
      handler: "company.list",
    },
  ],
};
