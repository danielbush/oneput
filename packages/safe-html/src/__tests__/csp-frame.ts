import DOMPurify from "dompurify";
import { contentConfig, checkContentValues } from "../lib/policies.js";
import {
  sanitiseHtml,
  insertSafeHtml,
  setDocumentHTML,
  sanitiseDocumentNodes,
} from "../setHTML.js";

// A separate document gives the browser a real CSP and its own module realm.
const target = document.createElement("div");
document.body.append(target);
document.addEventListener("securitypolicyviolation", (event) => {
  document.body.dataset.violation = `${document.body.dataset.violation ?? ""} ${event.effectiveDirective}`;
});

try {
  if (document.body.dataset.mode === "tt") {
    let refused = false;
    try {
      target.innerHTML = "<b>unchecked</b>";
    } catch {
      refused = true;
    }
    document.body.dataset.rawRefused = String(refused);
  }

  const documentTarget = document.createElement("div");
  documentTarget.id = "document-target";
  documentTarget.textContent = "original";
  document.body.append(documentTarget);
  try {
    setDocumentHTML(documentTarget, '<p onclick="bad()">document</p>');
    document.body.dataset.documentRefused = "false";
  } catch {
    document.body.dataset.documentRefused = "true";
  }
  const nodes = document.createElement("div");
  const paragraph = document.createElement("p");
  paragraph.textContent = "nodes";
  // This attribute is inert until inserted. Node checks also work under TT.
  paragraph.setAttribute("href", "javascript:bad()");
  nodes.append(paragraph);
  sanitiseDocumentNodes(nodes);
  nodes.id = "document-nodes";
  document.body.append(nodes);

  const result = sanitiseHtml(
    '<strong onclick="bad()">checked</strong><script>bad()</script>',
  );
  if (result.isErr()) throw result.error;
  insertSafeHtml(target, result.value);

  const fallback = document.createElement("div");
  fallback.id = "fallback";
  fallback.replaceChildren(
    DOMPurify.sanitize(
      '<strong onclick="bad()">checked</strong><script>bad()</script>',
      contentConfig("display"),
    ),
  );
  checkContentValues(fallback, "display");
  document.body.append(fallback);

  // Inline CSS is refused by style-src, independent of Trusted Types support.
  const style = document.createElement("style");
  style.textContent = "body { --unsafe-csp-probe: blocked; }";
  document.head.append(style);
  document.body.dataset.styleValue = getComputedStyle(document.body)
    .getPropertyValue("--unsafe-csp-probe")
    .trim();
  document.body.dataset.done = "true";
} catch (error) {
  document.body.dataset.error = String(error);
  document.body.dataset.done = "true";
}
