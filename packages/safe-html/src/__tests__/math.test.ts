// @vitest-environment jsdom
import { expect, test } from "vitest";
import { setHTML, sanitiseHtml } from "../setHTML.js";
import { mathPolicyCases } from "./math-cases.js";

mathPolicyCases("math policy", setHTML);

test("math returns a typed refusal", () => {
  // arrange
  const input = '<span style="position:fixed">x</span>';

  // act
  const result = sanitiseHtml(input, "math");

  // assert
  expect(result.isErr()).toBe(true);
  if (result.isErr()) expect(result.error).toBeInstanceOf(Error);
});
