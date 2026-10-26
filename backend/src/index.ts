// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap() {
    const port = process.env.PORT || 1337;
    const base = `http://127.0.0.1:${port}/api`;
    setTimeout(() => {
      Promise.all([
        fetch(`${base}/company-list?page=1`),
        fetch(`${base}/company-list?status=all&page=1`),
        fetch(`${base}/company-filters`),
      ]).catch(() => {});
    }, 5000);
  },
};
