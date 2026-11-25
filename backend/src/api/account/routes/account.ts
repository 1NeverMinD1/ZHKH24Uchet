export default {
  routes: [
    {
      method: "GET",
      path: "/account/challenge",
      handler: "account.challenge",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/account/login",
      handler: "account.login",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/account/me",
      handler: "account.me",
      config: { auth: false },
    },
    {
      method: "PUT",
      path: "/account/me",
      handler: "account.updateMe",
      config: { auth: false },
    },
  ],
};
