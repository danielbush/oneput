import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    provide: { requireNativeSanitizer: false },
    include: ["src/__tests__/setHTML.browser.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        {
          browser: "chromium",
          provider: playwright({ launchOptions: { channel: "chrome" } }),
          provide: { requireNativeSanitizer: true },
        },
        { browser: "firefox" },
        { browser: "webkit" },
      ],
      api: { port: 3010 },
    },
  },
});
