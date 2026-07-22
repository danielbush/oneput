# ELIZA (vendored)

Classic ELIZA chatbot engine used by the oneput-demo `ElizaChat` AppObject.

## Attribution

- **JavaScript implementation:** [elizabot.js](http://www.masswerk.at/elizabot/) v1.1 by © Norbert Landsteiner 2005; [mass:werk – media environments](http://www.masswerk.at). Free software, provided “as is”.
- **Documented / demo’d at:** [Eliza (elizabot.js) — VU sample page](https://www.cs.vu.nl/~eliens/demo/sample-js-eliza-bot.htm) (A. Eliëns / VU demo mirroring the mass:werk docs).
- **Original program:** Joseph Weizenbaum, “ELIZA – A Computer Program For the Study of Natural Language Communication Between Man and Machine,” *Communications of the ACM* 9:1 (January 1966), pp. 36–45.

Files here (`elizabot.js`, `elizadata.js`) are Landsteiner’s library adapted to ESM (`import`/`export`) for the Vite/SvelteKit demo. Functional content matches the mass:werk release (sourced via a public mirror when masswerk.at returned 403).

## API (Landsteiner)

```js
const eliza = new ElizaBot();
const initial = eliza.getInitial();
const reply = eliza.transform(input);
if (eliza.quit) { /* quit phrase */ }
eliza.reset();
```
