import { declarativeAppWith } from '../../common/declarative.js';
import type { DemoDocument } from '../katex/katex.js';
import { createContent } from './content.js';
import { createKatexMachine } from './machine.js';

/**
 * The KaTeX machine as a child of a routed app (`ROUTED_DECL`), see
 * {@link declarativeAppWith}. Accepted formulas go in `doc`.
 */
export function createKatexApp({ doc }: { doc: DemoDocument }) {
  return declarativeAppWith(createKatexMachine(doc), createContent());
}
