const NCALAYER_URL = "wss://127.0.0.1:13579/";

export class NcaLayerError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

export function signAuth(dataB64, locale = "ru") {
  return new Promise((resolve, reject) => {
    let socket;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (socket && socket.readyState <= 1) socket.close();
      fn(value);
    };

    try {
      socket = new WebSocket(NCALAYER_URL);
    } catch {
      reject(new NcaLayerError("NCALAYER_NOT_RUNNING"));
      return;
    }

    socket.onerror = () =>
      finish(reject, new NcaLayerError("NCALAYER_NOT_RUNNING"));
    socket.onclose = () => finish(reject, new NcaLayerError("NCALAYER_CLOSED"));

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          module: "kz.gov.pki.knca.basics",
          method: "sign",
          args: {
            allowedStorages: null,
            format: "cms",
            data: dataB64,
            signingParams: {
              decode: true,
              encapsulate: false,
              digested: false,
              tsaProfile: {},
            },
            signerParams: { extKeyUsageOids: [], chain: [] },
            locale: locale === "kk" ? "kk" : "ru",
          },
        }),
      );
    };

    socket.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg && msg.result && msg.result.version) return;
      if (!msg || msg.status !== true) {
        finish(
          reject,
          new NcaLayerError(
            "NCALAYER_ERROR",
            (msg && (msg.details || msg.message)) || "",
          ),
        );
        return;
      }
      const result = msg.body && msg.body.result;
      const cms = Array.isArray(result) ? result[0] : result;
      if (!cms) {
        finish(reject, new NcaLayerError("CANCELED"));
        return;
      }
      finish(resolve, cms);
    };
  });
}
