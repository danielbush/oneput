/**
 * DOM_RETENTION — the shared undo primitive for element-level operations.
 *
 * Removing an element loses its position: by the time an undo runs, the
 * surrounding siblings may themselves have been removed or moved. Instead of
 * recording "child index 3 of parent X", we leave a DELETE_MARKER `<template>`
 * exactly where the element sat. The marker is a real node, so it rides along
 * with any later edits to its neighbourhood, and restoring is just "put the
 * element back where the marker is".
 *
 * The marker is tagged IGNORE so navigation and tokenization skip it while it
 * stands in for the absent element.
 *
 * Every reversible op in this directory — insert, move, remove, split — is
 * built from this pair.
 */
import { JSED_DELETED_CLASS, JSED_IGNORE_CLASS } from '../../core/taxonomy.js';

/**
 * Create the DELETE_MARKER used for DOM_RETENTION.
 */
export function createElementDeleteMarker(ownerDocument: Document = document) {
  const container = ownerDocument.createElement('template');
  container.classList.add(JSED_DELETED_CLASS);
  container.classList.add(JSED_IGNORE_CLASS);
  return container;
}

/**
 * Remove an element while preserving its exact DOM position with a DELETE_MARKER.
 */
export function retainElementPosition(element: HTMLElement, marker: HTMLElement) {
  element.before(marker);
  element.remove();
}

/**
 * Restore an element to its DOM_RETENTION marker.
 */
export function restoreRetainedElement(element: HTMLElement, marker: HTMLElement) {
  marker.before(element);
  marker.remove();
}
