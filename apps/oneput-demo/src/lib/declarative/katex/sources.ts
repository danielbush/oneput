import type { SafeHtml } from '@oneput/safe-html';

export type FormulaContext = {
  source: string;
  displayMode: boolean;
  preview: SafeHtml | null;
  error: string | null;
};

type FormulaSnapshot = { context: FormulaContext };

export function canInsert({ preview, error }: FormulaContext) {
  return preview !== null && error === null;
}

/** Supply the current formula and the controls that depend on it. */
export const sources = {
  text: {
    formulaSource: ({ context }: FormulaSnapshot) => context.source,
    formulaError: ({ context }: FormulaSnapshot) => 'Invalid katex: ' + context.error
  },
  html: { formulaPreview: ({ context }: FormulaSnapshot) => context.preview },
  lists: {},
  release: {},
  enabled: {
    canInsert: ({ context }: FormulaSnapshot) => canInsert(context),
    displayMode: ({ context }: FormulaSnapshot) => context.displayMode
  }
};
