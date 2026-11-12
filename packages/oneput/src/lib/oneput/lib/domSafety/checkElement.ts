/**
 * Decides which tag, attributes and styles of a builder element may be written
 * to the page. It only computes: it does not touch the DOM and does not warn.
 */
import { checkedLink } from '@oneput/safe-html';
import type { AttributeValue, ElementDescription } from './types.js';

const tags = new Set(
  'a article aside b blockquote br button caption code col colgroup dd del details div dl dt em fieldset figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img input kbd label legend li main nav ol optgroup option p pre s section select small span strong sub summary sup table tbody td th thead time tr ul'.split(
    ' '
  )
);
const globalAttributes = new Set(['title', 'role', 'tabindex', 'hidden', 'dir', 'lang']);
const elementAttributes: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
  button: ['type', 'disabled', 'name', 'value'],
  img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
  input: [
    'type',
    'name',
    'value',
    'placeholder',
    'disabled',
    'checked',
    'readonly',
    'required',
    'min',
    'max',
    'step',
    'maxlength',
    'autocomplete',
    'inputmode'
  ],
  select: ['name', 'disabled', 'required', 'multiple'],
  option: ['value', 'selected', 'disabled'],
  optgroup: ['label', 'disabled'],
  label: ['for'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  col: ['span'],
  colgroup: ['span'],
  time: ['datetime'],
  details: ['open']
};
const events = new Set(
  'onclick ondblclick onpointerdown onpointerup onpointermove onpointerenter onpointerleave onpointercancel onmousedown onmouseup onmouseenter onmouseleave onkeydown onkeyup oninput onchange onfocus onblur onfocusin onfocusout onscroll onwheel oncontextmenu ontouchstart ontouchend'.split(
    ' '
  )
);
const styleProperties = new Set(
  'alignContent alignItems alignSelf background backgroundColor border borderColor borderRadius borderStyle borderWidth bottom boxSizing color columnGap cursor display flex flexBasis flexDirection flexGrow flexShrink flexWrap font fontFamily fontSize fontStyle fontWeight gap height justifyContent justifyItems justifySelf left letterSpacing lineHeight margin marginBottom marginLeft marginRight marginTop maxHeight maxWidth minHeight minWidth objectFit opacity order overflow overflowX overflowY padding paddingBottom paddingLeft paddingRight paddingTop position right rowGap textAlign textDecoration textOverflow top verticalAlign visibility whiteSpace width wordBreak wordWrap'.split(
    ' '
  )
);

/**
 * Returns the parts of `params` that are safe to write, and lists what it
 * removed. FChild and Flex write only the returned `tag`, `attr` and `style`.
 *
 * - `tag`: an unknown tag, or one such as `script`, `iframe` or `textarea`,
 *   becomes `div`.
 * - `attr`: only allow-listed attributes stay. `on*` attributes stay only when
 *   they are known events with a function value. `href` and `src` must pass
 *   `checkedLink`, so `href="javascript:..."` is dropped; `src` must also be
 *   HTTP(S) or relative. `target="_blank"` adds `rel="noopener noreferrer"`.
 * - `style`: only allow-listed properties with simple values stay, written as
 *   one CSS string. `url(...)`, `var(...)`, `calc(...)`, `;` and `!important`
 *   are dropped.
 * - `refused`: one entry per removed item, such as `tag:script`,
 *   `attribute:onclick` or `style:zIndex`.
 */
export function checkElement(params: ElementDescription) {
  const refused: string[] = [];
  const requested = typeof params.tag === 'string' ? params.tag.toLowerCase() : 'div';
  const tag = tags.has(requested) ? requested : 'div';
  if (tag !== requested) refused.push(`tag:${requested}`);
  const attr: Record<string, AttributeValue> = {};
  for (const [key, value] of Object.entries(params.attr ?? {})) {
    const name = key.toLowerCase();
    let allowed = /^[a-z][a-z0-9-]*$/.test(name);
    if (name.startsWith('on')) allowed &&= events.has(name) && typeof value === 'function';
    else {
      allowed &&= typeof value === 'string' || typeof value === 'boolean';
      allowed &&=
        globalAttributes.has(name) ||
        /^aria-[a-z-]+$/.test(name) ||
        /^data-[a-z0-9-]+$/.test(name) ||
        (elementAttributes[tag] ?? []).includes(name);
    }
    let checked = value;
    if (name === 'href' || name === 'src') {
      const url = typeof value === 'string' ? checkedLink(value) : undefined;
      allowed &&= url !== undefined;
      if (name === 'src' && url !== undefined) {
        allowed &&= ['http:', 'https:'].includes(new URL(url, 'https://oneput.invalid/').protocol);
      }
      checked = url ?? '';
    }
    if (name === 'target') allowed &&= value === '_self' || value === '_blank';
    if (allowed) attr[name] = checked;
    else refused.push(`attribute:${key}`);
  }
  if (attr.target === '_blank') attr.rel = 'noopener noreferrer';
  const declarations: string[] = [];
  for (const [name, value] of Object.entries(params.style ?? {})) {
    // A value may not hold a backslash escape, a second declaration (`;`, `{`),
    // `!important`, `@` rules, or functions that load or compute values.
    const safe =
      styleProperties.has(name) &&
      typeof value === 'string' &&
      /^[a-zA-Z0-9\s#.,%()+\-/'"]*$/.test(value) &&
      !/(?:url|image|expression|var|attr|calc)\s*\(|javascript|data:|@|!|[;{}\\]/i.test(value) &&
      (name !== 'position' || ['static', 'relative', 'absolute'].includes(value)) &&
      (name !== 'opacity' || (Number(value) >= 0 && Number(value) <= 1));
    if (safe)
      declarations.push(
        `${name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}:${value}`
      );
    else refused.push(`style:${name}`);
  }
  return { tag, attr, style: declarations.join(';'), refused };
}
