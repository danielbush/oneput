/**
 * Find HTML sinks in source so that new unchecked writes fail the source check.
 * Resolve local constant names and check unknown writes on known HTML receivers.
 * Use the Svelte parser to keep scripts, expressions and comments separate.
 */
import { createRequire } from "node:module";
import ts from "typescript";

const { parse: parseSvelte } = createRequire(
  new URL("../../packages/oneput/package.json", import.meta.url),
)("svelte/compiler");

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

function literal(node, checker, seen = new Set()) {
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node))
    return literal(node.expression, checker, seen);
  if (ts.isIdentifier(node)) {
    const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
    if (declaration && !seen.has(declaration)) {
      return literal(
        constantInitializer(declaration, checker),
        checker,
        new Set([...seen, declaration]),
      );
    }
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const part = literal(span.expression, checker, seen);
      if (part === undefined) return undefined;
      value += part + span.literal.text;
    }
    return value;
  }
  if (ts.isParenthesizedExpression(node) || ts.isComputedPropertyName(node))
    return literal(node.expression, checker, seen);
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = literal(node.left, checker, seen);
    const right = literal(node.right, checker, seen);
    if (left !== undefined && right !== undefined) return left + right;
  }
}

function constantInitializer(declaration, checker) {
  if (ts.isVariableDeclaration(declaration))
    return declaration.parent.flags & ts.NodeFlags.Const
      ? declaration.initializer
      : undefined;
  if (!ts.isBindingElement(declaration)) return undefined;
  const pattern = declaration.parent;
  const initializer = constantInitializer(pattern.parent, checker);
  if (!initializer) return undefined;
  if (
    ts.isArrayBindingPattern(pattern) &&
    ts.isArrayLiteralExpression(initializer)
  )
    return (
      initializer.elements[pattern.elements.indexOf(declaration)] ??
      declaration.initializer
    );
  if (ts.isObjectBindingPattern(pattern)) {
    const object = constantObject(initializer, checker);
    const name = declaration.propertyName ?? declaration.name;
    const key = ts.isIdentifier(name) ? name.text : literal(name, checker);
    if (!object || key === undefined || declaration.dotDotDotToken)
      return undefined;
    const properties = new Map();
    for (const property of object.properties) {
      if (!property.name) return undefined;
      const name = ts.isIdentifier(property.name)
        ? property.name.text
        : literal(property.name, checker);
      if (name === undefined || properties.has(name)) return undefined;
      properties.set(name, property);
    }
    const property = properties.get(key);
    if (!property) return declaration.initializer;
    return ts.isPropertyAssignment(property) ? property.initializer : undefined;
  }
}

function memberName(node, checker) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node))
    return literal(node.argumentExpression, checker);
}

function assignment(node) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (
      ts.isBinaryExpression(parent) &&
      parent.left === current &&
      parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    )
      return true;
    if (
      (ts.isForOfStatement(parent) || ts.isForInStatement(parent)) &&
      parent.initializer === current
    )
      return true;
    if (
      ts.isParenthesizedExpression(parent) ||
      ts.isArrayLiteralExpression(parent) ||
      ts.isSpreadElement(parent) ||
      ts.isSpreadAssignment(parent) ||
      ts.isObjectLiteralExpression(parent) ||
      (ts.isPropertyAssignment(parent) && parent.initializer === current)
    ) {
      current = parent;
    } else return false;
  }
  return false;
}

// Use local and platform types without loading application imports.
// Share library syntax trees between files. Each file keeps its own local scope.
const compilerOptions = {
  target: ts.ScriptTarget.Latest,
  noResolve: true,
  allowJs: true,
  allowNonTsExtensions: true,
};
const libraryHost = ts.createCompilerHost(compilerOptions);
const libraries = new Map();
function checkerFor(file) {
  const host = {
    ...libraryHost,
    getSourceFile(path, languageVersion) {
      if (path === file.fileName) return file;
      if (!libraries.has(path))
        libraries.set(path, libraryHost.getSourceFile(path, languageVersion));
      return libraries.get(path);
    },
  };
  return ts
    .createProgram([file.fileName], compilerOptions, host)
    .getTypeChecker();
}

function htmlCapable(node, checker) {
  const type = checker.getTypeAtLocation(node);
  const parts = type.isUnion() ? type.types : [type];
  return parts.some((part) =>
    [...htmlProperties].some((name) => part.getProperty(name)),
  );
}

function constantObject(node, checker, seen = new Set()) {
  if (ts.isObjectLiteralExpression(node)) return node;
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    return constantObject(node.expression, checker, seen);
  if (!ts.isIdentifier(node)) return undefined;
  const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
  if (
    !declaration ||
    !ts.isVariableDeclaration(declaration) ||
    !(declaration.parent.flags & ts.NodeFlags.Const) ||
    !declaration.initializer ||
    seen.has(declaration)
  )
    return undefined;
  return constantObject(
    declaration.initializer,
    checker,
    new Set([...seen, declaration]),
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
    const position =
      typeof offset === "function" ? offset : (index) => offset + index;
    const file = ts.createSourceFile(
      path,
      script,
      ts.ScriptTarget.Latest,
      true,
      template || /\.[jt]sx$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    let localChecker;
    const checker = {
      getSymbolAtLocation(node) {
        return (localChecker ??= checkerFor(file)).getSymbolAtLocation(node);
      },
      getTypeAtLocation(node) {
        return (localChecker ??= checkerFor(file)).getTypeAtLocation(node);
      },
    };
    function propertyWrite(name, target, node) {
      if (
        htmlProperties.has(name) ||
        (name === undefined && htmlCapable(target, checker))
      )
        add(
          name ?? "computed HTML write",
          position(node.getStart(file)),
          position(node.end),
          ownerName(node),
        );
    }
    function visit(node) {
      if (
        ts.isJsxAttribute(node) &&
        ["srcdoc", "dangerouslySetInnerHTML"].includes(node.name.getText(file))
      ) {
        add(
          node.name.getText(file),
          position(node.getStart(file)),
          position(node.end),
        );
      }
      if (ts.isBindingElement(node)) {
        const property = node.propertyName ?? node.name;
        const name = ts.isIdentifier(property)
          ? property.text
          : literal(property, checker);
        if (methods.has(name))
          add(
            name,
            position(node.getStart(file)),
            position(node.end),
            ownerName(node),
          );
      }
      const name = memberName(node, checker);
      if (
        (ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)) &&
        assignment(node)
      )
        propertyWrite(name, node.expression, node);
      if (methods.has(name)) {
        add(
          name,
          position(node.getStart(file)),
          position(node.end),
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
          position(node.getStart(file)),
          position(node.end),
          ownerName(node),
        );
      }
      if (
        ts.isCallExpression(node) &&
        ["setAttribute", "setAttributeNS"].includes(
          memberName(node.expression, checker),
        )
      ) {
        const index =
          memberName(node.expression, checker) === "setAttributeNS" ? 1 : 0;
        if (
          literal(node.arguments[index], checker)?.toLowerCase() === "srcdoc"
        ) {
          add(
            "srcdoc",
            position(node.getStart(file)),
            position(node.end),
            ownerName(node),
          );
        }
      }
      if (ts.isCallExpression(node)) {
        const operation = memberName(node.expression, checker);
        const receiver = node.expression.expression;
        if (
          receiver &&
          ts.isIdentifier(receiver) &&
          receiver.text === "Reflect" &&
          operation === "set" &&
          node.arguments.length >= 2
        )
          propertyWrite(
            literal(node.arguments[1], checker),
            node.arguments[0],
            node,
          );
        if (
          receiver &&
          ts.isIdentifier(receiver) &&
          receiver.text === "Object" &&
          operation === "assign" &&
          node.arguments.length >= 2
        ) {
          for (const argument of node.arguments.slice(1)) {
            const object = constantObject(argument, checker);
            if (!object) {
              propertyWrite(undefined, node.arguments[0], argument);
              continue;
            }
            for (const property of object.properties) {
              if (!property.name) {
                propertyWrite(undefined, node.arguments[0], property);
                continue;
              }
              const name = ts.isIdentifier(property.name)
                ? property.name.text
                : literal(property.name, checker);
              propertyWrite(name, node.arguments[0], property);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  if (path.endsWith(".svelte")) {
    const ast = parseSvelte(source, { modern: true });
    // Keep JavaScript scopes from the component and map findings to source.
    const parts = [];
    const positions = [];
    const html = [];
    function synthetic(text, at) {
      parts.push(text);
      positions.push(...Array(text.length).fill(at));
    }
    function copy(node) {
      parts.push(source.slice(node.start, node.end));
      for (let index = node.start; index < node.end; index++)
        positions.push(index);
    }
    function expression(node) {
      if (!node) return;
      synthetic("(", node.start);
      copy(node);
      synthetic(");", node.end);
    }
    function binding(node) {
      if (!node) return;
      synthetic("let ", node.start);
      copy(node);
      synthetic(";", node.end);
    }
    function visitMarkup(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "Comment" || node.type === "Text") return;
      if (node.type === "Fragment") {
        synthetic("{", 0);
        node.nodes.forEach(visitMarkup);
        synthetic("}", source.length);
        return;
      }
      if (node.type === "HtmlTag") html.push(node);
      if (node.type === "ConstTag") {
        copy(node.declaration);
        synthetic(";", node.declaration.end);
        return;
      }
      if (node.type === "EachBlock") {
        expression(node.expression);
        synthetic("{", node.start);
        binding(node.context);
        if (node.index) synthetic(`let ${node.index};`, node.start);
        expression(node.key);
        visitMarkup(node.body);
        synthetic("}", node.end);
        visitMarkup(node.fallback);
        return;
      }
      if (node.type === "SnippetBlock") {
        synthetic("function ", node.start);
        copy(node.expression);
        synthetic("(", node.expression.end);
        node.parameters.forEach((parameter, index) => {
          if (index) synthetic(",", parameter.start);
          copy(parameter);
        });
        synthetic(")", node.expression.end);
        visitMarkup(node.body);
        return;
      }
      if (node.type === "AwaitBlock") {
        expression(node.expression);
        visitMarkup(node.pending);
        for (const [branch, name] of [
          [node.then, node.value],
          [node.catch, node.error],
        ]) {
          synthetic("{", node.start);
          binding(name);
          visitMarkup(branch);
          synthetic("}", node.end);
        }
        return;
      }
      if (
        node.type === "Attribute" &&
        ["srcdoc", "dangerouslySetInnerHTML"].includes(node.name)
      )
        add(node.name, node.start, node.end);
      if (/Expression$|Pattern$|Literal$|^Identifier$/.test(node.type ?? "")) {
        expression(node);
        return;
      }
      for (const [key, child] of Object.entries(node)) {
        if (["loc", "metadata"].includes(key)) continue;
        if (Array.isArray(child)) child.forEach(visitMarkup);
        else if (child && typeof child === "object") visitMarkup(child);
      }
    }
    if (ast.module) {
      copy(ast.module.content);
      synthetic(";", ast.module.content.end);
    }
    synthetic("{", 0);
    if (ast.instance) {
      copy(ast.instance.content);
      synthetic(";", ast.instance.content.end);
    }
    visitMarkup(ast.fragment);
    synthetic("}", source.length);
    scanScript(parts.join(""), (index) => positions[index] ?? source.length);
    for (const node of html) add("@html", node.start, node.end);
  } else if (path.endsWith(".html")) {
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
