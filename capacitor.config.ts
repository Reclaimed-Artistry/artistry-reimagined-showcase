import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.selahbible.multiversion",
  appName: "Selah",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "SelahBible",
    backgroundColor: "#FFFFFF",
  },
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#FFFFFF",
    },
  },
};

export default config;
