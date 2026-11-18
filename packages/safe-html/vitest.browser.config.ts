import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "safe-html-csp-fixture",
      configureServer(server) {
        // Firefox resolves 'self' in a srcdoc meta policy against about:srcdoc.
        // An HTTP response gives the frame and its module the same origin.
        server.middlewares.use("/__safe-html-csp", (request, response) => {
          const mode = request.url === "/tt" ? "tt" : "csp";
          const trustedTypes =
            mode === "tt"
              ? " require-trusted-types-for 'script'; trusted-types dompurify;"
              : "";
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader(
            "Content-Security-Policy",
            `script-src 'self'; style-src 'none'; object-src 'none';${trustedTypes}`,
          );
          response.end(`<!doctype html>
<body data-mode="${mode}">
<script type="module" src="/src/__tests__/csp-frame.ts"></script>
</body>`);
        });
      },
    },
  ],
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
