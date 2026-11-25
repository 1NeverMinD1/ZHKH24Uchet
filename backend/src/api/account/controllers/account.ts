import type { Core } from "@strapi/strapi";

const fail = (ctx: any, status: number, code: string) => {
  ctx.status = status;
  ctx.body = { data: null, error: { status, name: code, message: code } };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async challenge(ctx: any) {
    const service: any = strapi.service("api::account.account");
    try {
      ctx.set("Cache-Control", "no-store");
      ctx.body = service.createChallenge();
    } catch {
      return fail(ctx, 503, "TOO_MANY_CHALLENGES");
    }
  },

  async login(ctx: any) {
    const service: any = strapi.service("api::account.account");
    const body = ctx.request.body || {};
    const nonce = body.nonce;
    const cms = body.cms;
    if (
      typeof nonce !== "string" ||
      typeof cms !== "string" ||
      !nonce ||
      !cms ||
      cms.length > 200000
    ) {
      return fail(ctx, 400, "BAD_REQUEST");
    }
    const challenge = service.takeChallenge(nonce);
    if (!challenge) return fail(ctx, 400, "CHALLENGE_EXPIRED");

    let result;
    try {
      result = await service.verifyCms(cms, challenge.data);
    } catch {
      return fail(ctx, 503, "NCANODE_UNAVAILABLE");
    }

    const info = service.extractCertificate(result);
    if (info.error) return fail(ctx, 401, info.error);

    const user = await service.upsertUser(info);
    if (user.blocked) return fail(ctx, 403, "USER_BLOCKED");

    ctx.set("Cache-Control", "no-store");
    ctx.body = {
      jwt: service.issueJwt(user),
      user: service.toProfile(user),
      bin: info.bin,
    };
  },

  async me(ctx: any) {
    const service: any = strapi.service("api::account.account");
    const user = await service.getAuthUser(ctx);
    if (!user) return fail(ctx, 401, "UNAUTHORIZED");
    ctx.set("Cache-Control", "no-store");
    ctx.body = { user: service.toProfile(user) };
  },

  async updateMe(ctx: any) {
    const service: any = strapi.service("api::account.account");
    const user = await service.getAuthUser(ctx);
    if (!user) return fail(ctx, 401, "UNAUTHORIZED");
    let phone;
    try {
      phone = service.normalizePhone((ctx.request.body || {}).phone);
    } catch {
      return fail(ctx, 400, "INVALID_PHONE");
    }
    if (phone) {
      const taken = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({ where: { phone, id: { $ne: user.id } } });
      if (taken) return fail(ctx, 409, "PHONE_TAKEN");
    }
    const updated = await strapi.db
      .query("plugin::users-permissions.user")
      .update({ where: { id: user.id }, data: { phone } });
    ctx.body = { user: service.toProfile(updated) };
  },
});
