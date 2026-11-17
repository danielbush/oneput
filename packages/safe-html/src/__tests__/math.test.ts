// @vitest-environment jsdom
import { setHTML } from "../setHTML.js";
import { mathPolicyCases } from "./math-cases.js";

mathPolicyCases("math policy", setHTML);
