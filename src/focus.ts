export function getCurrentFocus(): HTMLElement | null {
  const ae = document.activeElement;
  if (ae && ae instanceof window.HTMLElement) {
    return ae;
  }
  return null;
}
