import fs from "node:fs";
import path from "node:path";
import { displayName } from "./og-image";

const SITE_NAME = "ЖКХ24 Учет";
const LOCALES = ["ru", "kk"];
const DEFAULT_LOCALE = "ru";
const OG_LOCALES: Record<string, string> = { ru: "ru_RU", kk: "kk_KZ" };

const INDEX_PATH =
  process.env.FRONTEND_INDEX ||
  path.join(process.cwd(), "..", "frontend", "dist", "index.html");

let cachedIndex: { mtime: number; html: string } | null = null;

export const readIndex = () => {
  const stat = fs.statSync(INDEX_PATH);
  if (!cachedIndex || cachedIndex.mtime !== stat.mtimeMs) {
    cachedIndex = {
      mtime: stat.mtimeMs,
      html: fs.readFileSync(INDEX_PATH, "utf8"),
    };
  }
  return cachedIndex.html;
};

const escapeHtml = (value: any) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (value: string) =>
  value ? value.slice(0, 10).split("-").reverse().join(".") : "";

const TEXTS: Record<string, any> = {
  ru: {
    title: (name: string, bin: string) => `${name} — БИН ${bin}`,
    lead: (name: string, bin: string) => `${name}, БИН ${bin}.`,
    registered: (date: string) => `Зарегистрирована ${date}.`,
    active: "Действующая.",
    gone: (date: string) => `Выбыла из реестра ${date}.`,
    activity: (value: string) => `Вид деятельности: ${value}.`,
    location: (value: string) => `Местонахождение: ${value}.`,
    director: (value: string) => `Руководитель: ${value}.`,
  },
  kk: {
    title: (name: string, bin: string) => `${name} — БСН ${bin}`,
    lead: (name: string, bin: string) => `${name}, БСН ${bin}.`,
    registered: (date: string) => `${date} тіркелген.`,
    active: "Жұмыс істеп тұр.",
    gone: (date: string) => `${date} тізілімнен шықты.`,
    activity: (value: string) => `Қызмет түрі: ${value}.`,
    location: (value: string) => `Орналасқан жері: ${value}.`,
    director: (value: string) => `Басшы: ${value}.`,
  },
};

const fitSentences = (parts: any[], max = 160) => {
  let text = "";
  for (const part of parts) {
    if (!part) continue;
    const next = text ? `${text} ${part}` : part;
    if (next.length <= max) text = next;
  }
  return text;
};

const localized = (ruValue: string, kkValue: string, locale: string) =>
  locale === "kk" ? kkValue || ruValue : ruValue || kkValue;

export const companyHead = ({
  company,
  locale,
  siteUrl,
  apiUrl,
}: {
  company: any;
  locale: string;
  siteUrl: string;
  apiUrl: string;
}) => {
  const t = TEXTS[locale] || TEXTS[DEFAULT_LOCALE];
  const shortRu = displayName(company.name_ru, company.legal_form);
  const name = locale === "kk" ? company.name_kk || shortRu : shortRu;
  const activity = localized(
    company.oked_name_ru,
    company.oked_name_kk,
    locale,
  );
  const locality = localized(company.locality_ru, company.locality_kk, locale);

  const title = `${t.title(name, company.bin)} — ${SITE_NAME}`;
  const description = fitSentences([
    t.lead(name, company.bin),
    company.registration_date &&
      t.registered(formatDate(company.registration_date)),
    company.status === "gone"
      ? t.gone(formatDate(company.last_seen))
      : t.active,
    activity && t.activity(activity),
    locality && t.location(locality),
    company.director_name && t.director(company.director_name),
  ]);

  const urlOf = (code: string) => `${siteUrl}/${code}/company/${company.slug}`;
  const image = `${apiUrl}/og/company/${company.slug_code}.png`;

  const tags = [
    `<title data-ssr>${escapeHtml(title)}</title>`,
    `<meta data-ssr name="description" content="${escapeHtml(description)}" />`,
    `<meta data-ssr name="robots" content="index, follow" />`,
    `<link data-ssr rel="canonical" href="${escapeHtml(urlOf(locale))}" />`,
    ...LOCALES.map(
      (code) =>
        `<link data-ssr rel="alternate" hreflang="${code}" href="${escapeHtml(urlOf(code))}" />`,
    ),
    `<link data-ssr rel="alternate" hreflang="x-default" href="${escapeHtml(urlOf(DEFAULT_LOCALE))}" />`,
    `<meta data-ssr property="og:type" content="website" />`,
    `<meta data-ssr property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta data-ssr property="og:title" content="${escapeHtml(title)}" />`,
    `<meta data-ssr property="og:description" content="${escapeHtml(description)}" />`,
    `<meta data-ssr property="og:url" content="${escapeHtml(urlOf(locale))}" />`,
    `<meta data-ssr property="og:image" content="${escapeHtml(image)}" />`,
    `<meta data-ssr property="og:image:width" content="1200" />`,
    `<meta data-ssr property="og:image:height" content="630" />`,
    `<meta data-ssr property="og:locale" content="${OG_LOCALES[locale] || OG_LOCALES.ru}" />`,
    `<meta data-ssr name="twitter:card" content="summary_large_image" />`,
  ];

  return tags.join("\n    ");
};

export const notFoundHead = () =>
  `<meta data-ssr name="robots" content="noindex, follow" />`;

export const injectHead = (html: string, head: string, locale: string) =>
  html
    .replace(/<html lang="[^"]*">/, `<html lang="${locale}">`)
    .replace("</head>", `    ${head}\n  </head>`);
