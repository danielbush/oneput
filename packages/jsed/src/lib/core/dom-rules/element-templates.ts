import { FLOW_CONTENT, getAllowableChildTags, PHRASING_CONTENT } from './html-content.js';

export type ElementSpec = {
  tagName: string;
  children?: ElementSpec[];
};

export type ElementInsertOption = {
  id: string;
  label: string;
  spec: ElementSpec;
  placement?: {
    appendInside?: string[];
    insertInside?: string[];
  };
};

function isValidElementSpec(spec: ElementSpec): boolean {
  for (const child of spec.children ?? []) {
    if (!getAllowableChildTags(spec.tagName).includes(child.tagName.toLowerCase())) {
      return false;
    }
    if (!isValidElementSpec(child)) {
      return false;
    }
  }
  return true;
}

function defineElementInsertOption(option: ElementInsertOption): ElementInsertOption {
  if (!isValidElementSpec(option.spec)) {
    throw new Error(`Invalid element insert option: ${option.id}`);
  }
  return option;
}

const DEFAULT_INSERT_OPTIONS: ElementInsertOption[] = [
  ...FLOW_CONTENT.filter((tagName) => !['ul', 'ol', 'table'].includes(tagName)).map((tagName) =>
    defineElementInsertOption({
      id: tagName,
      label: `<${tagName}>`,
      spec: { tagName }
    })
  ),
  ...PHRASING_CONTENT.map((tagName) =>
    defineElementInsertOption({
      id: tagName,
      label: `<${tagName}>`,
      spec: { tagName }
    })
  ),
  defineElementInsertOption({
    id: 'ul',
    label: 'List',
    spec: { tagName: 'ul', children: [{ tagName: 'li' }] }
  }),
  defineElementInsertOption({
    id: 'ul-paragraph',
    label: 'List with paragraph',
    spec: { tagName: 'ul', children: [{ tagName: 'li', children: [{ tagName: 'p' }] }] }
  }),
  defineElementInsertOption({
    id: 'ol',
    label: 'Numbered list',
    spec: { tagName: 'ol', children: [{ tagName: 'li' }] }
  }),
  defineElementInsertOption({
    id: 'ol-paragraph',
    label: 'Numbered list with paragraph',
    spec: { tagName: 'ol', children: [{ tagName: 'li', children: [{ tagName: 'p' }] }] }
  }),
  defineElementInsertOption({
    id: 'li',
    label: 'list item - <li>',
    spec: { tagName: 'li' }
  }),
  defineElementInsertOption({
    id: 'table-body-cell',
    label: 'Table with body',
    spec: {
      tagName: 'table',
      children: [
        {
          tagName: 'tbody',
          children: [{ tagName: 'tr', children: [{ tagName: 'td' }, { tagName: 'td' }] }]
        }
      ]
    }
  }),
  defineElementInsertOption({
    id: 'table-head-body',
    label: 'Table with head and body',
    spec: {
      tagName: 'table',
      children: [
        {
          tagName: 'thead',
          children: [{ tagName: 'tr', children: [{ tagName: 'th' }, { tagName: 'th' }] }]
        },
        {
          tagName: 'tbody',
          children: [{ tagName: 'tr', children: [{ tagName: 'td' }, { tagName: 'td' }] }]
        }
      ]
    }
  }),
  defineElementInsertOption({
    id: 'thead',
    label: 'Table header',
    spec: { tagName: 'thead', children: [{ tagName: 'tr', children: [{ tagName: 'th' }] }] }
  }),
  defineElementInsertOption({
    id: 'tbody',
    label: 'Table body',
    spec: { tagName: 'tbody', children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }] }
  }),
  defineElementInsertOption({
    id: 'tfoot',
    label: 'Table footer',
    spec: { tagName: 'tfoot', children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }] }
  }),
  defineElementInsertOption({
    id: 'tr-cell',
    label: 'Table row with cell',
    spec: { tagName: 'tr', children: [{ tagName: 'td' }] },
    placement: {
      appendInside: ['table', 'tbody', 'tfoot'],
      insertInside: ['table', 'tbody', 'tfoot']
    }
  }),
  defineElementInsertOption({
    id: 'tr-heading',
    label: 'Table row with heading',
    spec: { tagName: 'tr', children: [{ tagName: 'th' }] },
    placement: {
      appendInside: ['thead'],
      insertInside: ['thead']
    }
  }),
  defineElementInsertOption({
    id: 'td',
    label: '<td>',
    spec: { tagName: 'td' }
  }),
  defineElementInsertOption({
    id: 'th',
    label: '<th>',
    spec: { tagName: 'th' }
  })
];

function createBareTagOption(tagName: string): ElementInsertOption {
  const normalized = tagName.toLowerCase();
  return {
    id: normalized,
    label: `<${normalized}>`,
    spec: { tagName: normalized }
  };
}

export function getElementInsertOptionsForTags(
  tagNames: string[],
  placement: keyof NonNullable<ElementInsertOption['placement']>,
  contextTagName: string
): ElementInsertOption[] {
  const allowed = new Set(tagNames.map((tagName) => tagName.toLowerCase()));
  const context = contextTagName.toLowerCase();
  const options = DEFAULT_INSERT_OPTIONS.filter((option) => {
    if (!allowed.has(option.spec.tagName.toLowerCase())) {
      return false;
    }
    const allowedContexts = option.placement?.[placement];
    if (!allowedContexts) {
      return true;
    }
    return allowedContexts.includes(context);
  });

  const covered = new Set(options.map((option) => option.spec.tagName.toLowerCase()));
  const bareTagOptions = Array.from(allowed)
    .filter((tagName) => !covered.has(tagName))
    .map(createBareTagOption);

  return [...options, ...bareTagOptions];
}
