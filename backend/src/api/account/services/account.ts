import { randomBytes } from "crypto";
import type { Core } from "@strapi/strapi";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_CHALLENGES = 10000;
const USER_UID = "plugin::users-permissions.user";

const challenges = new Map<string, { data: string; expiresAt: number }>();

const cleanup = () => {
  const now = Date.now();
  for (const [key, value] of challenges) {
    if (value.expiresAt <= now) challenges.delete(key);
  }
};

const titleCase = (value: unknown) => {
  const text = String(value || "").trim();
  if (!text) return null;
  return text
    .toLowerCase()
    .replace(/(^|[\s-])(\S)/g, (_m, sep, ch) => sep + ch.toUpperCase());
};

const mergeBins = (current: any, info: any, now: Date) => {
  const list = Array.isArray(current) ? current.filter((b) => b && b.bin) : [];
  if (!info.bin) return list;
  const rest = list.filter((b) => b.bin !== info.bin);
  return [
    {
      bin: info.bin,
      organization: info.organization,
      keyUser: info.keyUser,
      lastUsedAt: now.toISOString(),
    },
    ...rest,
  ];
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  createChallenge() {
    cleanup();
    if (challenges.size >= MAX_CHALLENGES)
      throw new Error("TOO_MANY_CHALLENGES");
    const nonce = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    const data = Buffer.from(
      `bindex.kz:auth:${nonce}:${expiresAt}`,
      "utf8",
    ).toString("base64");
    challenges.set(nonce, { data, expiresAt });
    return { nonce, data, expiresAt };
  },

  takeChallenge(nonce: string) {
    const item = challenges.get(nonce);
    if (!item) return null;
    challenges.delete(nonce);
    if (item.expiresAt <= Date.now()) return null;
    return item;
  },

  async verifyCms(cms: string, data: string) {
    const base = process.env.NCANODE_URL || "http://127.0.0.1:14579";
    const res = await fetch(`${base}/cms/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cms, data, revocationCheck: ["OCSP"] }),
      signal: AbortSignal.timeout(20000),
    });
    const json: any = await res.json().catch(() => null);
    if (!json || res.status >= 500) throw new Error("NCANODE_UNAVAILABLE");
    return json;
  },

  extractCertificate(result: any): any {
    if (!result || result.valid !== true) return { error: "SIGNATURE_INVALID" };
    const signers = Array.isArray(result.signers) ? result.signers : [];
    if (signers.length !== 1) return { error: "SIGNATURE_INVALID" };
    if (signers[0].status === "INVALID") return { error: "SIGNATURE_INVALID" };
    const cert = Array.isArray(signers[0].certificates)
      ? signers[0].certificates[0]
      : null;
    if (!cert) return { error: "CERT_NOT_FOUND" };
    if (cert.valid !== true) return { error: "CERT_INVALID" };
    if (cert.keyUsage !== "AUTH") return { error: "NOT_AUTH_KEY" };
    const revocations = Array.isArray(cert.revocations) ? cert.revocations : [];
    if (
      revocations.length === 0 ||
      revocations.some((r: any) => r && r.revoked)
    )
      return { error: "CERT_REVOKED" };

    const subject = cert.subject || {};
    const iin = String(subject.iin || "").trim();
    if (!/^\d{12}$/.test(iin)) return { error: "IIN_NOT_FOUND" };

    const keyUser: string[] = Array.isArray(cert.keyUser) ? cert.keyUser : [];
    const binRaw = String(subject.bin || "").trim();
    const bin = /^\d{12}$/.test(binRaw) ? binRaw : null;

    const words = String(subject.commonName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const surnameUpper = String(words[0] || "").toUpperCase();
    const patronymicRaw = [subject.lastName, subject.surName].find(
      (v) => v && String(v).trim().toUpperCase() !== surnameUpper,
    );
    const lastName = titleCase(words[0]);
    const firstName = titleCase(words.slice(1).join(" "));
    const middleName = titleCase(patronymicRaw);
    const fullName =
      [lastName, firstName, middleName].filter(Boolean).join(" ") || null;

    return {
      iin,
      bin,
      organization: subject.organization || null,
      keyUser,
      lastName,
      firstName,
      middleName,
      fullName,
    };
  },

  async upsertUser(info: any) {
    const query = strapi.db.query(USER_UID);
    const existing = await query.findOne({ where: { iin: info.iin } });
    const now = new Date();
    const data = {
      fullName: info.fullName,
      lastName: info.lastName,
      firstName: info.firstName,
      middleName: info.middleName,
      bins: mergeBins(existing?.bins, info, now),
      lastLoginAt: now,
    };
    if (existing) {
      return query.update({ where: { id: existing.id }, data });
    }
    const role = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "authenticated" } });
    return query.create({
      data: {
        ...data,
        username: info.iin,
        iin: info.iin,
        provider: "eds",
        confirmed: true,
        blocked: false,
        role: role ? role.id : null,
      },
    });
  },

  issueJwt(user: any) {
    return strapi
      .plugin("users-permissions")
      .service("jwt")
      .issue({ id: user.id });
  },

  async getAuthUser(ctx: any) {
    let payload: any = null;
    try {
      payload = await strapi
        .plugin("users-permissions")
        .service("jwt")
        .getToken(ctx);
    } catch {
      return null;
    }
    if (!payload || !payload.id) return null;
    const user = await strapi.db
      .query(USER_UID)
      .findOne({ where: { id: payload.id } });
    if (!user || user.blocked) return null;
    return user;
  },

  normalizePhone(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const digits = String(value).replace(/\D/g, "");
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8"))
      return "+7" + digits.slice(1);
    if (digits.length === 10 && digits[0] === "7") return "+7" + digits;
    throw new Error("INVALID_PHONE");
  },

  toProfile(user: any) {
    return {
      id: user.id,
      documentId: user.documentId,
      iin: user.iin,
      fullName: user.fullName,
      lastName: user.lastName,
      firstName: user.firstName,
      middleName: user.middleName,
      phone: user.phone || null,
      bins: Array.isArray(user.bins) ? user.bins : [],
      createdAt: user.createdAt,
    };
  },
});
