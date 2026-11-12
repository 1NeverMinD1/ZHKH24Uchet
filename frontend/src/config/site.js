export const SITE_NAME = "Bindex";

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "http://localhost:5173"
).replace(/\/$/, "");

export const DEFAULT_DESCRIPTION =
  "Проверка компаний Казахстана по БИН и названию: руководитель, юридический адрес и вид деятельности по данным открытых государственных реестров.";

export const DEFAULT_OG_IMAGE = "/og-default.png";
