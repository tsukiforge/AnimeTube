import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.animetube.app",
  appName: "AnimeTube",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;