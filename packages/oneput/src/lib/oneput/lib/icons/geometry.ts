/**
 * Checks icon geometry data before `drawIcon` turns it into SVG nodes. The data
 * is plain values; no SVG text is parsed.
 */
import { err, ok, type Result } from 'neverthrow';

export type IconNode = readonly [
  tag: string,
  attributes: Readonly<Record<string, string | number | undefined>>
];

/**
 * Icon geometry, in one of two forms:
 *
 * - a list of `[tag, attributes]` pairs, as Lucide exports it. The view box is
 *   `0 0 24 24`.
 * - `{ viewBox, nodes }`, for a custom icon with its own view box.
 */
export type IconDefinition =
  | readonly IconNode[]
  | {
      readonly viewBox: readonly [number, number, number, number];
      readonly nodes: readonly IconNode[];
    };

export type CheckedIcon = {
  readonly viewBox: readonly [number, number, number, number];
  readonly nodes: readonly IconNode[];
};

const tags = new Set(['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect']);
const attributes = new Set([
  'cx',
  'cy',
  'd',
  'fill',
  'stroke',
  'height',
  'points',
  'r',
  'rx',
  'ry',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2'
]);
const numberToken = /[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi;
const paint =
  /^(?:none|currentColor|transparent|#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8})$/i;

/**
 * Checks icon data and returns a frozen copy of it, or an error. One bad part
 * refuses the whole icon. A getter that throws also refuses it.
 *
 * - Tags: `circle`, `ellipse`, `line`, `path`, `polygon`, `polyline`, `rect`.
 * - Attributes: coordinates and sizes, `d`, `points`, `fill`, `stroke`. Their
 *   values hold only finite numbers (and path commands in `d`).
 * - `fill` and `stroke`: `none`, `currentColor`, `transparent` or a hex colour.
 * - Limits: 32 nodes, 16 attributes per node, 4096 characters per value, and
 *   16384 characters in all (tags, attribute names, values and view box).
 *
 * For example, `['a', { href: '...' }]` or `['path', { onclick: '...' }]`
 * refuses the icon.
 */
export function checkIconGeometry(input: unknown): Result<CheckedIcon, Error> {
  try {
    return checkGeometry(input);
  } catch {
    return err(new Error('Invalid icon data'));
  }
}

function checkGeometry(input: unknown): Result<CheckedIcon, Error> {
  const refuse = () => err<CheckedIcon, Error>(new Error('Invalid icon geometry'));
  if (!input || typeof input !== 'object') return refuse();
  if (!Array.isArray(input)) {
    let fields = 0;
    for (const name in input) {
      if (++fields > 2 || (name !== 'viewBox' && name !== 'nodes')) return refuse();
    }
  }
  const candidate = input as { viewBox?: unknown; nodes?: unknown };
  const rawViewBox = Array.isArray(input) ? [0, 0, 24, 24] : candidate.viewBox;
  if (!Array.isArray(rawViewBox) || rawViewBox.length !== 4) return refuse();
  const viewBox: [number, number, number, number] = [
    rawViewBox[0],
    rawViewBox[1],
    rawViewBox[2],
    rawViewBox[3]
  ];
  const nodes = Array.isArray(input) ? input : candidate.nodes;
  if (
    !viewBox.every((part) => typeof part === 'number' && Number.isFinite(part)) ||
    viewBox[2] <= 0 ||
    viewBox[3] <= 0 ||
    !Array.isArray(nodes) ||
    nodes.length === 0 ||
    nodes.length > 32
  )
    return refuse();

  let size = viewBox.join(' ').length;
  const checked: IconNode[] = [];
  const nodeCount = nodes.length;
  for (let index = 0; index < nodeCount; index++) {
    const node = nodes[index];
    if (!Array.isArray(node) || node.length !== 2) return refuse();
    const tag = node[0];
    const attrs = node[1];
    if (
      typeof tag !== 'string' ||
      !tags.has(tag) ||
      !attrs ||
      typeof attrs !== 'object' ||
      Array.isArray(attrs)
    )
      return refuse();
    size += tag.length;
    const copy: Record<string, string | number> = {};
    let count = 0;
    for (const name in attrs) {
      if (++count > 16) return refuse();
      if (!Object.prototype.hasOwnProperty.call(attrs, name)) continue;
      if (!attributes.has(name)) return refuse();
      const value = attrs[name];
      size += name.length;
      if (value === undefined) continue;
      if (typeof value !== 'number' && typeof value !== 'string') return refuse();
      if (typeof value === 'number' && !Number.isFinite(value)) return refuse();
      const text = String(value);
      size += text.length;
      if (text.length > 4096 || size > 16384) return refuse();
      if (name === 'fill' || name === 'stroke') {
        if (!paint.test(text)) return refuse();
      } else {
        // Remove the numbers. Only spaces, commas and (in `d`) path command
        // letters may be left.
        const remainder = text.replace(numberToken, '');
        const allowed = name === 'd' ? /^[\s,MmZzLlHhVvCcSsQqTtAa]*$/ : /^[\s,]*$/;
        if (
          !allowed.test(remainder) ||
          !text.match(numberToken)?.every((part) => Number.isFinite(Number(part)))
        )
          return refuse();
      }
      copy[name] = value;
    }
    if (size > 16384) return refuse();
    checked.push(Object.freeze([tag, Object.freeze(copy)] as const));
  }
  return ok(Object.freeze({ viewBox: Object.freeze(viewBox), nodes: Object.freeze(checked) }));
}
