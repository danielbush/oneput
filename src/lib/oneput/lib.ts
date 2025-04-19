// TODO: rename FlexParams
export type FlexParams = {
  tag?: string;
  attr?: Record<string, string | boolean>;
  id?: string;
  classes?: Array<string>;
  style?: Partial<CSSStyleDeclaration>;
  type: 'hflex' | 'vflex';
  children?: Array<FlexParams | FChildParams>;
  /** List of HTML void elements. */
  voidElements?: Set<string | undefined>;
};

export type FChildParams = {
  id?: string;
  tag?: string;
  /**
   * Use boolean for boolean attributes, like `disabled`, `checked`, etc.
   */
  attr?: Record<string, string | boolean>;
  /**
   * This is optional.  It also makes satisfying the type-checker easier.
   */
  type?: 'fchild';
  classes?: Array<string>;
  style?: Partial<CSSStyleDeclaration>;
  textContent?: string;
  innerHTMLUnsafe?: string;
  onMount?: (node: HTMLElement) => void | (() => void);
  onPointerDown?: (event: PointerEvent, node: HTMLElement) => void;
  /** List of HTML void elements. */
  voidElements?: Set<string | undefined>;
};

export const defaultVoidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);
