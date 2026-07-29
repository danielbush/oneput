/**
 * A declarative update to one existing element.
 */
export type ElementPatch = {
  /** Set an attribute, or remove it with `null`. */
  readonly attributes?: Readonly<Record<string, string | null>>;
  readonly classes?: {
    /** Class tokens to add after removals are applied. */
    readonly add?: readonly string[];
    /** Class tokens to remove before additions are applied. */
    readonly remove?: readonly string[];
  };
  /** Replace presentation-only child markup. */
  readonly html?: string;
};

/**
 * State captured for only the fields touched by an element patch.
 */
type TouchedElementState = {
  attributes?: ReadonlyMap<string, string | null>;
  classes?: ReadonlyMap<string, boolean>;
  html?: string;
};

/**
 * Reversible record for one applied element patch.
 */
export type PatchElementOperation = {
  readonly action: 'patch-element';
  readonly element: HTMLElement;
  readonly patch: ElementPatch;
  readonly before: TouchedElementState;
};

/**
 * Apply a patch and capture the state needed to reverse it.
 */
export function patchElement(
  element: HTMLElement,
  input: ElementPatch
): PatchElementOperation | null {
  const patch = copyElementPatch(input);
  if (!wouldChangeElement(element, patch)) {
    return null;
  }

  const before = captureTouchedState(element, patch);
  applyElementPatch(element, patch);
  return {
    action: 'patch-element',
    element,
    patch,
    before
  };
}

/**
 * Restore the state touched by an element patch.
 */
export function undoPatchElement(operation: PatchElementOperation): void {
  restoreTouchedState(operation.element, operation.before);
}

/**
 * Reapply an element patch.
 */
export function redoPatchElement(operation: PatchElementOperation): void {
  applyElementPatch(operation.element, operation.patch);
}

/**
 * Copy caller-owned patch data so redo remains deterministic.
 */
function copyElementPatch(patch: ElementPatch): ElementPatch {
  return {
    attributes: patch.attributes ? { ...patch.attributes } : undefined,
    classes: patch.classes
      ? {
          add: patch.classes.add ? [...patch.classes.add] : undefined,
          remove: patch.classes.remove ? [...patch.classes.remove] : undefined
        }
      : undefined,
    html: patch.html
  };
}

/**
 * Check whether applying a patch would change touched element state.
 */
function wouldChangeElement(element: HTMLElement, patch: ElementPatch): boolean {
  for (const [name, value] of Object.entries(patch.attributes ?? {})) {
    if (value === null ? element.hasAttribute(name) : element.getAttribute(name) !== value) {
      return true;
    }
  }

  const removedClasses = new Set(patch.classes?.remove ?? []);
  const addedClasses = new Set(patch.classes?.add ?? []);
  const classTokens = new Set([...removedClasses, ...addedClasses]);
  for (const token of classTokens) {
    const presentAfter = addedClasses.has(token);
    if (element.classList.contains(token) !== presentAfter) {
      return true;
    }
  }

  return patch.html !== undefined && element.innerHTML !== patch.html;
}

/**
 * Capture only the attributes, class tokens, and markup named by a patch.
 */
function captureTouchedState(element: HTMLElement, patch: ElementPatch): TouchedElementState {
  const attributes = patch.attributes
    ? new Map(Object.keys(patch.attributes).map((name) => [name, element.getAttribute(name)]))
    : undefined;
  const classTokens = new Set([...(patch.classes?.remove ?? []), ...(patch.classes?.add ?? [])]);
  const classes = patch.classes
    ? new Map([...classTokens].map((token) => [token, element.classList.contains(token)]))
    : undefined;

  return {
    attributes,
    classes,
    html: patch.html === undefined ? undefined : element.innerHTML
  };
}

/**
 * Apply attributes, class removals, class additions, and markup in order.
 */
function applyElementPatch(element: HTMLElement, patch: ElementPatch): void {
  for (const [name, value] of Object.entries(patch.attributes ?? {})) {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  for (const token of patch.classes?.remove ?? []) {
    element.classList.remove(token);
  }
  for (const token of patch.classes?.add ?? []) {
    element.classList.add(token);
  }

  if (patch.html !== undefined) {
    element.innerHTML = patch.html;
  }
}

/**
 * Restore only the element state captured before a patch.
 */
function restoreTouchedState(element: HTMLElement, state: TouchedElementState): void {
  for (const [name, value] of state.attributes ?? []) {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  for (const [token, present] of state.classes ?? []) {
    element.classList.toggle(token, present);
  }

  if (state.html !== undefined) {
    element.innerHTML = state.html;
  }
}
