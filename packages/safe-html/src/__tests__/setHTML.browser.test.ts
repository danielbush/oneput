import { expect, test } from "vitest";
import { setHTML } from "../setHTML.js";

test("browser: inserts safe HTML", () => {
  // arrange
  const element = document.createElement("div");
  document.body.append(element);
  expect(typeof (element as Element & { setHTML?: unknown }).setHTML).toBe(
    "function",
  );

  // act
  setHTML(
    element,
    '<p data-chat onclick="alert(1)">Hello <strong>Dan</strong>. <a href="javascript:alert(1)">Link</a></p><script>alert(1)</script>',
  );

  // assert
  expect(element.querySelector("strong")?.textContent).toBe("Dan");
  expect(element.querySelector("script")).toBeNull();
  expect(element.querySelector("p")?.hasAttribute("data-chat")).toBe(false);
  expect(element.querySelector("p")?.hasAttribute("onclick")).toBe(false);
  expect(element.querySelector("a")?.hasAttribute("href")).toBe(false);
});
