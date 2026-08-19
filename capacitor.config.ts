import type { CapacitorConfig } from "@capacitor/cli";

const pkg = require("./package.json");

const config: CapacitorConfig = {
  appId: "com.animetube.app",
  appName: "AnimeTube",
  appVersion: pkg.version,
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      showSpinner: false,
      splashImmersive: true,
      backgroundColor: "#0f0f0f",
    },
  },
};

export default config;
