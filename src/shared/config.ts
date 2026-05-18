export const appConfig = {
  appName: "mesh-light-paint",
  storagePrefix: "mesh-light-paint",
  description:
    "Synchronized phone-screen light painting. Wave the phones in front of a long-exposure camera and the patterns line up.",
  accentHex: "#ff8a4a",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-light-paint",
  pagesUrl: "https://baditaflorin.github.io/mesh-light-paint/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
