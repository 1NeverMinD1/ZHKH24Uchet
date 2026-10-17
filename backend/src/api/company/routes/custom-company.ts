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
    {
      method: "GET",
      path: "/sitemap.xml",
      handler: "company.sitemapIndex",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sitemap-static.xml",
      handler: "company.sitemapStatic",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sitemap-companies-:page.xml",
      handler: "company.sitemapCompanies",
      config: { auth: false },
    },
  ],
};
