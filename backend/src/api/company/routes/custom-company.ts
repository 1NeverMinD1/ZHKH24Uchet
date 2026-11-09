export default {
  routes: [
    {
      method: "GET",
      path: "/company-search",
      handler: "company.search",
    },
    {
      method: "GET",
      path: "/company-card/:slug",
      handler: "company.card",
    },
    {
      method: "GET",
      path: "/company-list",
      handler: "company.list",
    },
    {
      method: "GET",
      path: "/company-filters",
      handler: "company.filters",
    },
    {
      method: "GET",
      path: "/catalog-index",
      handler: "company.catalogIndex",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/catalog-list",
      handler: "company.catalogList",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/og/company/:code.png",
      handler: "company.ogImage",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/seo/:locale/company/:slug",
      handler: "company.seoPage",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/company-dashboard/:code",
      handler: "company.dashboard",
      config: { auth: false },
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
    {
      method: "GET",
      path: "/sitemap-addresses-:page.xml",
      handler: "company.sitemapAddresses",
      config: { auth: false },
    },
  ],
};
