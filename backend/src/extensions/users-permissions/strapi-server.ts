export default (plugin: any) => {
  plugin.controllers.user.updateMe = async (ctx: any) => {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized();
    }

    const { firstName, lastName, phone, email } = ctx.request.body || {};
    const data: Record<string, string> = {};

    if (typeof firstName === "string") data.firstName = firstName.trim();
    if (typeof lastName === "string") data.lastName = lastName.trim();
    if (typeof email === "string") data.email = email.trim().toLowerCase();
    if (typeof phone === "string") {
      data.phone = phone.replace(/[^\d+]/g, "");
      data.username = data.phone;
    }

    const query = strapi.db.query("plugin::users-permissions.user");

    if (data.email) {
      const taken = await query.findOne({
        where: { email: data.email, id: { $ne: authUser.id } },
      });
      if (taken) {
        return ctx.badRequest("Этот email уже используется");
      }
    }

    if (data.phone) {
      const taken = await query.findOne({
        where: { phone: data.phone, id: { $ne: authUser.id } },
      });
      if (taken) {
        return ctx.badRequest("Этот номер телефона уже используется");
      }
    }

    const updated = await query.update({
      where: { id: authUser.id },
      data,
    });

    ctx.body = {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
    };
  };

  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/user/me",
    handler: "user.updateMe",
    config: {
      prefix: "",
    },
  });

  return plugin;
};
