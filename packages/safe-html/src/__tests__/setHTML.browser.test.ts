import { expect, test } from "vitest";
import { setHTML, untrustedDocumentPolicy } from "../setHTML.js";

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

test("browser: the document policy keeps structure markup and removes active content", () => {
  // arrange
  const element = document.createElement("div");
  document.body.append(element);

  // act
  setHTML(
    element,
    '<article class="task" data-task="todo" aria-label="Task" onclick="alert(1)"><button type="button">Done</button></article><!-- note --><form><p>in form</p></form><iframe></iframe><script>alert(1)</script>',
    untrustedDocumentPolicy,
  );

  // assert
  expect(element.innerHTML).toBe(
    '<article class="task" data-task="todo" aria-label="Task"><button type="button">Done</button></article><!-- note -->',
  );
});
