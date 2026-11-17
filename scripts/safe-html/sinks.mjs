import ts from "typescript";

const methods = new Set([
  "insertAdjacentHTML",
  "createContextualFragment",
  "parseFromString",
  "setHTMLUnsafe",
  "parseHTMLUnsafe",
  "write",
  "writeln",
  "DOMParser",
]);
const htmlProperties = new Set(["innerHTML", "outerHTML", "srcdoc"]);

function literal(node) {
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isComputedPropertyName(node))
    return literal(node.expression);
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = literal(node.left);
    const right = literal(node.right);
    if (left !== undefined && right !== undefined) return left + right;
  }
}

function memberName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node))
    return literal(node.argumentExpression);
}

function assignment(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current.parent)) current = current.parent;
  const parent = current.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.left === current &&
    parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  );
}

function ownerName(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current)) return current.name?.text;
  }
}

/** Finds raw HTML writes and parser access. Reads of saved markup are allowed. */
export function scanSource(path, source) {
  const findings = [];
  function add(kind, start, end, owner) {
    findings.push({
      kind,
      line: source.slice(0, start).split("\n").length,
      source: source.slice(start, end).replace(/\s+/g, " ").trim(),
      owner,
    });
  }
  function scanScript(script, offset, template = false) {
    const file = ts.createSourceFile(
      path,
      script,
      ts.ScriptTarget.Latest,
      true,
      template || /\.[jt]sx$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function visit(node) {
      if (
        ts.isJsxAttribute(node) &&
        ["srcdoc", "dangerouslySetInnerHTML"].includes(node.name.getText(file))
      ) {
        add(
          node.name.getText(file),
          offset + node.getStart(file),
          offset + node.end,
        );
      }
      if (ts.isBindingElement(node)) {
        const property = node.propertyName ?? node.name;
        const name = ts.isIdentifier(property)
          ? property.text
          : literal(property);
        if (methods.has(name))
          add(
            name,
            offset + node.getStart(file),
            offset + node.end,
            ownerName(node),
          );
      }
      const name = memberName(node);
      if ((htmlProperties.has(name) && assignment(node)) || methods.has(name)) {
        add(
          name,
          offset + node.getStart(file),
          offset + node.end,
          ownerName(node),
        );
      }
      if (
        ts.isIdentifier(node) &&
        node.text === "DOMParser" &&
        !ts.isTypeReferenceNode(node.parent) &&
        !ts.isPropertyAccessExpression(node.parent)
      ) {
        add(
          "DOMParser",
          offset + node.getStart(file),
          offset + node.end,
          ownerName(node),
        );
      }
      if (
        ts.isCallExpression(node) &&
        ["setAttribute", "setAttributeNS"].includes(memberName(node.expression))
      ) {
        const index = memberName(node.expression) === "setAttributeNS" ? 1 : 0;
        if (literal(node.arguments[index])?.toLowerCase() === "srcdoc") {
          add(
            "srcdoc",
            offset + node.getStart(file),
            offset + node.end,
            ownerName(node),
          );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  if (/\.(svelte|html)$/.test(path)) {
    // Preserve offsets when removing comments. Commented examples are not sinks.
    const markup = source.replace(/<!--[\s\S]*?-->/g, (comment) =>
      comment.replace(/[^\n]/g, " "),
    );
    for (const match of markup.matchAll(
      /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi,
    )) {
      scanScript(match[1], match.index + match[0].indexOf(">") + 1);
    }
    const template = markup.replace(
      /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,
      (script) => script.replace(/[^\n]/g, " "),
    );
    scanScript(template, 0, true);
    if (path.endsWith(".svelte")) {
      for (const match of template.matchAll(/\{@html\s+([^}]+)\}/g)) {
        add("@html", match.index, match.index + match[0].length);
      }
    }
  } else scanScript(source, 0);
  return findings;
}

/** An exception grants one named sink, rather than access to a whole source file. */
export function checkFindings(path, findings, exceptions, fixturePaths) {
  if (Object.hasOwn(fixturePaths, path)) return [];
  const allowed = exceptions.filter((entry) => entry.path === path);
  const unused = new Set(allowed);
  const errors = [];
  for (const finding of findings) {
    const entry = [...unused].find(
      (entry) =>
        entry.kind === finding.kind &&
        entry.source === finding.source &&
        entry.owner === finding.owner,
    );
    if (entry) unused.delete(entry);
    else
      errors.push(
        `${path}:${finding.line}: unlisted ${finding.kind}: ${finding.source}`,
      );
  }
  for (const entry of unused)
    errors.push(`${path}: stale sink exception: ${entry.source}`);
  return errors;
}
