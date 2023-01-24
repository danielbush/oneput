function makeDoc(content: string): string {
  return `<!DOCTYPE html><body>${content}</body>`;
}

const EXAMPLE = {
  simpleList: makeDoc(
    '<ul id="ul"><li id="li1">item 1</li><li id="li2">item 2</li></ul>',
  ),
  recList: makeDoc(
    `<ul id="ul"><li id="li1"><ul id="ul2"><li>item 1.1</li><li>item 1.2</li></ul></li><li id="li2">item 2</li></ul>`,
  ),
};

export default EXAMPLE;
