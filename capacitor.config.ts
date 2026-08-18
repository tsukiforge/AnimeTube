import type { CapacitorConfig } from "@capacitor/cli";

const pkg = require('./package.json');

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
      launchShowDuration: 0,
    },
  },
};

export default config;