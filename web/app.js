function moveNext() {
  const current = document.querySelector('span.cursor');
  if (current && current.nextElementSibling) {
    current.classList.remove('cursor');
    current.nextElementSibling.classList.add('cursor');
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(current.nextElementSibling.textContent);
    }
  }
}

function movePrevious() {
  const current = document.querySelector('span.cursor');
  if (current && current.previousElementSibling) {
    current.classList.remove('cursor');
    current.previousElementSibling.classList.add('cursor');
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(current.previousElementSibling.textContent);
    }
  }
}

function updateCursorText(text) {
  const current = document.querySelector('span.cursor');
  if (current) {
    current.textContent = text;
  }
}

function moveNextParagraph() {
  const current = document.querySelector('p.focus');
  if (current && current.nextElementSibling?.tagName === 'P') {
    current.classList.remove('focus');
    current.nextElementSibling.classList.add('focus');
    current.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function movePreviousParagraph() {
  const current = document.querySelector('p.focus');
  if (current && current.previousElementSibling?.tagName === 'P') {
    current.classList.remove('focus');
    current.previousElementSibling.classList.add('focus');
    current.previousElementSibling.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function insertParagraphAfterFocus() {
  const current = document.querySelector('p.focus');
  if (current) {
    const newParagraph = document.createElement('p');
    newParagraph.innerHTML = '<span>insert</span>';
    current.after(newParagraph);
  }
}

(function () {
  const firstParagraph = document.querySelector('p');
  if (firstParagraph) {
    firstParagraph.classList.add('focus');
    const text = firstParagraph.textContent;
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    firstParagraph.innerHTML = words.map((word) => '<span>' + word + '</span>').join(' ');

    // Add cursor to first span
    const firstSpan = firstParagraph.querySelector('span');
    if (firstSpan) {
      firstSpan.classList.add('cursor');
    }

    // Add click listeners to all spans
    const spans = firstParagraph.querySelectorAll('span');
    spans.forEach((span) => {
      span.style.cursor = 'pointer';
      span.addEventListener('click', function () {
        if (window.ReactNativeWebView) {
          document.querySelector('span.cursor')?.classList.remove('cursor');
          span.classList.add('cursor');
          window.ReactNativeWebView.postMessage(this.textContent);
        }
      });
    });
  }
})();
