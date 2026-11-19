import { err, ok, type Result } from 'neverthrow';
import { isDocumentTagAllowed } from '@oneput/safe-html';
import { canCreateWithAnchor, type ElementSpec } from '../../core/dom-rules.js';
import { anchorize } from '../anchor.js';

const MAX_SPEC_NODES = 10_000;
const MAX_SPEC_DEPTH = 64;

/** Why {@link checkSpec} refused a spec. */
export type SpecRefusal =
  | { type: 'too-many-nodes'; limit: number }
  | { type: 'too-deep'; limit: number }
  | { type: 'cycle' }
  | { type: 'tag-not-allowed'; tagName: string };

/** Thrown by {@link createElement}. Read `reason` for the cause. */
export class SpecRefusedError extends Error {
  constructor(readonly reason: SpecRefusal) {
    super(`Document element specification refused: ${describeRefusal(reason)}`);
    this.name = 'SpecRefusedError';
  }
}

function describeRefusal(reason: SpecRefusal): string {
  switch (reason.type) {
    case 'too-many-nodes':
      return `more than ${reason.limit} nodes`;
    case 'too-deep':
      return `nested deeper than ${reason.limit} levels`;
    case 'cycle':
      return 'the spec contains itself';
    case 'tag-not-allowed':
      return `tag "${reason.tagName}" is not allowed`;
  }
}

/** Check the whole {@link ElementSpec} before creating DOM nodes. Throws {@link SpecRefusedError}. */
export function createElement(
  spec: ElementSpec,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  const checked = checkSpec(spec);
  if (checked.isErr()) throw new SpecRefusedError(checked.error);
  return buildElement(checked.value, options);
}

/**
 * Check a whole spec as plain data, before any DOM node exists, and return a
 * checked copy, or a {@link SpecRefusal} that says why it refused.
 *
 * Refuses more than MAX_SPEC_NODES nodes, nesting deeper than MAX_SPEC_DEPTH,
 * a spec that contains itself (a cycle), and tags `isDocumentTagAllowed`
 * rejects. Checking first makes a refusal cost microseconds and create nothing.
 *
 * Why a copy: building calls `document.createElement(tag)`. Allowed tags
 * include custom elements (`my-widget`), and creating a registered one runs its
 * constructor, which is page code. If we built from the caller's spec, that
 * code could change the spec mid-build, for example by adding 50,000 children
 * after the check passed. The copy holds only `tagName` and `children`, and
 * only this function has it, so what gets built is exactly what was checked.
 */
function checkSpec(spec: ElementSpec): Result<ElementSpec, SpecRefusal> {
  let count = 0;
  const ancestors = new Set<ElementSpec>();
  const tooMany = err<ElementSpec, SpecRefusal>({ type: 'too-many-nodes', limit: MAX_SPEC_NODES });

  function visit(current: ElementSpec, depth: number): Result<ElementSpec, SpecRefusal> {
    if (++count > MAX_SPEC_NODES) return tooMany;
    if (depth > MAX_SPEC_DEPTH) return err({ type: 'too-deep', limit: MAX_SPEC_DEPTH });
    if (ancestors.has(current)) return err({ type: 'cycle' });

    const { tagName, children } = current;
    if (!isDocumentTagAllowed(tagName)) return err({ type: 'tag-not-allowed', tagName });
    if (!children) return ok({ tagName });
    if (count + children.length > MAX_SPEC_NODES) return tooMany;

    const checkedChildren: ElementSpec[] = [];
    ancestors.add(current);
    for (const child of children) {
      const checkedChild = visit(child, depth + 1);
      if (checkedChild.isErr()) return checkedChild;
      checkedChildren.push(checkedChild.value);
    }
    ancestors.delete(current);
    return ok({ tagName, children: checkedChildren });
  }

  return visit(spec, 0);
}

function buildElement(spec: ElementSpec, options: { addAnchors: boolean }): HTMLElement {
  const el = document.createElement(spec.tagName);
  const children = spec.children ?? [];
  if (options.addAnchors && children.length === 0 && canCreateWithAnchor(spec.tagName)) {
    anchorize(el);
  }
  for (const child of children) {
    el.appendChild(buildElement(child, options));
  }
  return el;
}
