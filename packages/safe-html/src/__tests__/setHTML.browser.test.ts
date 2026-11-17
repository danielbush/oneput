import DOMPurify from "dompurify";
import { describe, expect, inject, test } from "vitest";
import { setHTML } from "../setHTML.js";
import { checkContentValues, contentConfig } from "../lib/policies.js";
import { documentPolicyCases } from "./document-cases.js";
import { mathPolicyCases } from "./math-cases.js";
import { uiPolicyCases } from "./ui-cases.js";

declare module "vitest" {
  interface ProvidedContext {
    requireNativeSanitizer: boolean;
  }
}

test.runIf(inject("requireNativeSanitizer"))(
  "Chrome provides native sanitisation and Trusted Types",
  () => {
    // arrange
    const target = document.createElement("div");

    // act
    const native = (target as Element & { setHTML?: unknown }).setHTML;

    // assert
    expect(typeof native).toBe("function");
    expect("trustedTypes" in window).toBe(true);
  },
);

// Compare the actual native path with the real fallback pipeline. No DOM API is
// replaced to force a branch. Both paths must satisfy the same expected DOM.
describe.skipIf(
  typeof (document.createElement("div") as Element & { setHTML?: unknown })
    .setHTML !== "function",
)("native UI policy", () => {
  uiPolicyCases("native", setHTML);
  mathPolicyCases("native math policy", setHTML);
});
uiPolicyCases("DOMPurify UI policy", (target, input, policy) => {
  target.replaceChildren(DOMPurify.sanitize(input, contentConfig(policy)));
  checkContentValues(target, policy);
});
uiPolicyCases("selected UI path", setHTML);
mathPolicyCases("DOMPurify math policy", (target, input, policy) => {
  try {
    target.replaceChildren(DOMPurify.sanitize(input, contentConfig(policy)));
    checkContentValues(target, policy);
  } catch (error) {
    target.textContent = "Content unavailable";
    throw error;
  }
});
mathPolicyCases("selected math path", setHTML);
documentPolicyCases();

for (const mode of ["csp", "tt"] as const) {
  test.skipIf(mode === "tt" && !("trustedTypes" in window))(
    `${mode}: checked UI content under an enforced browser policy`,
    async () => {
      // arrange
      const frame = document.createElement("iframe");
      const script = new URL("./csp-frame.ts", import.meta.url).href;
      const trustedTypes =
        mode === "tt"
          ? "require-trusted-types-for 'script'; trusted-types dompurify;"
          : "";
      frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="script-src 'self'; style-src 'none'; object-src 'none'; ${trustedTypes}"><body data-mode="${mode}"><script type="module" src="${script}"></script>`;

      // act
      document.body.append(frame);

      // assert
      try {
        await expect
          .poll(() => frame.contentDocument?.body.dataset.done)
          .toBe("true");
        const body = frame.contentDocument!.body;
        expect(body.dataset.error).toBeUndefined();
        expect(body.querySelector("div:not([id])")?.innerHTML).toBe(
          "<strong>checked</strong>",
        );
        expect(body.querySelector("#fallback")?.innerHTML).toBe(
          "<strong>checked</strong>",
        );
        expect(body.dataset.styleValue).toBe("");
        await expect.poll(() => body.dataset.violation).toMatch(/style-src/);
        expect(body.querySelector("#document-nodes")?.innerHTML).toBe(
          "<p>nodes</p>",
        );
        if (mode === "tt") {
          expect(body.dataset.rawRefused).toBe("true");
          expect(body.dataset.documentRefused).toBe("true");
          expect(body.querySelector("#document-target")?.textContent).toBe(
            "original",
          );
        } else {
          expect(body.dataset.documentRefused).toBe("false");
          expect(body.querySelector("#document-target")?.innerHTML).toBe(
            "<p>document</p>",
          );
        }
      } finally {
        frame.remove();
      }
    },
  );
}
