import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.selahbible.multiversion",
  appName: "Selah Bible",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "SelahBible",
    backgroundColor: "#1C1917",
  },
  android: {
    backgroundColor: "#1C1917",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#1C1917",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#1C1917",
    },
  },
};

export default config;
