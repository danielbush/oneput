import { FLOW_CONTENT, getAllowableChildTags, PHRASING_CONTENT } from './html-content.js';

export type ElementSpec = {
  tagName: string;
  children?: ElementSpec[];
};

export type ElementTemplate = {
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

function defineElementTemplate(template: ElementTemplate): ElementTemplate {
  if (!isValidElementSpec(template.spec)) {
    throw new Error(`Invalid element template: ${template.id}`);
  }
  return template;
}

const DEFAULT_TEMPLATES: ElementTemplate[] = [
  ...FLOW_CONTENT.filter((tagName) => !['ul', 'ol', 'table'].includes(tagName)).map((tagName) =>
    defineElementTemplate({
      id: tagName,
      label: `<${tagName}>`,
      spec: { tagName }
    })
  ),
  ...PHRASING_CONTENT.map((tagName) =>
    defineElementTemplate({
      id: tagName,
      label: `<${tagName}>`,
      spec: { tagName }
    })
  ),
  defineElementTemplate({
    id: 'ul',
    label: 'List',
    spec: { tagName: 'ul', children: [{ tagName: 'li' }] }
  }),
  defineElementTemplate({
    id: 'ul-paragraph',
    label: 'List with paragraph',
    spec: { tagName: 'ul', children: [{ tagName: 'li', children: [{ tagName: 'p' }] }] }
  }),
  defineElementTemplate({
    id: 'ol',
    label: 'Numbered list',
    spec: { tagName: 'ol', children: [{ tagName: 'li' }] }
  }),
  defineElementTemplate({
    id: 'ol-paragraph',
    label: 'Numbered list with paragraph',
    spec: { tagName: 'ol', children: [{ tagName: 'li', children: [{ tagName: 'p' }] }] }
  }),
  defineElementTemplate({
    id: 'li',
    label: 'list item - <li>',
    spec: { tagName: 'li' }
  }),
  defineElementTemplate({
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
  defineElementTemplate({
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
  defineElementTemplate({
    id: 'thead',
    label: 'Table header',
    spec: { tagName: 'thead', children: [{ tagName: 'tr', children: [{ tagName: 'th' }] }] }
  }),
  defineElementTemplate({
    id: 'tbody',
    label: 'Table body',
    spec: { tagName: 'tbody', children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }] }
  }),
  defineElementTemplate({
    id: 'tfoot',
    label: 'Table footer',
    spec: { tagName: 'tfoot', children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }] }
  }),
  defineElementTemplate({
    id: 'tr-cell',
    label: 'Table row with cell',
    spec: { tagName: 'tr', children: [{ tagName: 'td' }] },
    placement: {
      appendInside: ['table', 'tbody', 'tfoot'],
      insertInside: ['table', 'tbody', 'tfoot']
    }
  }),
  defineElementTemplate({
    id: 'tr-heading',
    label: 'Table row with heading',
    spec: { tagName: 'tr', children: [{ tagName: 'th' }] },
    placement: {
      appendInside: ['thead'],
      insertInside: ['thead']
    }
  }),
  defineElementTemplate({
    id: 'td',
    label: '<td>',
    spec: { tagName: 'td' }
  }),
  defineElementTemplate({
    id: 'th',
    label: '<th>',
    spec: { tagName: 'th' }
  })
];

export function getElementTemplates(): ElementTemplate[] {
  return DEFAULT_TEMPLATES;
}

export function getElementTemplatesForTags(
  tagNames: string[],
  placement: keyof NonNullable<ElementTemplate['placement']>,
  contextTagName: string
): ElementTemplate[] {
  const allowed = new Set(tagNames.map((tagName) => tagName.toLowerCase()));
  const context = contextTagName.toLowerCase();
  return DEFAULT_TEMPLATES.filter((template) => {
    if (!allowed.has(template.spec.tagName.toLowerCase())) {
      return false;
    }
    const allowedContexts = template.placement?.[placement];
    if (!allowedContexts) {
      return true;
    }
    return allowedContexts.includes(context);
  });
}
