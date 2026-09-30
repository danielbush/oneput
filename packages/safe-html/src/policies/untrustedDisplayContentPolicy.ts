/**
 * Allow common display markup from an untrusted source.
 *
 * Example: use this for chat agents returning html.
 */
export const untrustedDisplayContentPolicy = {
  elements: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
  ],
  attributes: ["href", "title"],
  dataAttributes: false,
  comments: false,
};
