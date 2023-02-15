import { defaultBindings } from './config/binding';
import { loadBindings } from './binding';
import { walk } from './walk';

const TABS = new Set<Element>();
const SIB_FOCUS = new Set<Element>();
// TODO: move to a css constants module?
const SBR_FOCUS_SIBLING = 'sbr-focus-sibling';

export function tabify(start: HTMLElement): void {
  TABS.add(start);
  start.setAttribute('tabindex', '0');
  walk(start, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
}

export function serialize(root: Element): string {
  walk(root, (el) => {
    if (TABS.has(el)) {
      el.removeAttribute('tabindex');
    }
  });
  return root.outerHTML;
}

export function load(root: HTMLElement): () => void {
  tabify(root);
  root.addEventListener<'click'>('click', handleElementClick);
  root.addEventListener<'focusin'>('focusin', handleFocusChange);
  const unloadKeys = loadBindings(defaultBindings, root);
  const unload = () => {
    unloadKeys();
  };
  return unload;
}

function handleFocusChange() {
  showCurrentSiblings();
}

function handleElementClick(evt: MouseEvent) {
  const el = evt.target;
  if (!el) {
    return;
  }
  if (el instanceof window.HTMLElement) {
    if (TABS.has(el)) {
      el.focus();
      showCurrentSiblings();
    }
  }
}

function clearCurrentSiblings(): void {
  for (const sib of SIB_FOCUS) {
    sib.classList.remove(SBR_FOCUS_SIBLING);
  }
  SIB_FOCUS.clear();
}

function showCurrentSiblings(): void {
  clearCurrentSiblings();
  const active = document.activeElement;
  const pnode = active?.parentElement;
  if (active && pnode && TABS.has(active)) {
    for (const child of pnode.children) {
      if (TABS.has(child) && child !== active) {
        SIB_FOCUS.add(child);
        child.classList.add(SBR_FOCUS_SIBLING);
      }
    }
  }
}
