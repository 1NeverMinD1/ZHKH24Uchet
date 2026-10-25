export default {
  routes: [
    {
      method: "GET",
      path: "/history/snapshots",
      handler: "history.snapshots",
    },
    {
      method: "GET",
      path: "/history/territories",
      handler: "history.territories",
    },
    {
      method: "GET",
      path: "/history/changes",
      handler: "history.changes",
    },
    {
      method: "GET",
      path: "/history/company/:slug",
      handler: "history.company",
    },
    {
      method: "GET",
      path: "/history/address/:id",
      handler: "history.address",
    },
    {
      method: "GET",
      path: "/history/directors",
      handler: "history.directors",
    },
    {
      method: "GET",
      path: "/history/director/:id",
      handler: "history.director",
    },
  ],
};
