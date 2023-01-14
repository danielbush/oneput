const liveServer = require('live-server');

const params = {
  port: 8080, // Set the server port. Defaults to 8080.
  host: '0.0.0.0', // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
  // root: '/public', // Set root directory that's being served. Defaults to cwd.
  open: false, // When false, it won't load your browser by default.
  // ignore: 'scss,my/templates', // comma-separated string for paths to ignore
  // file: 'src/examples/index.html', // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
  wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
  // mount: [['../build', '/build']], // Mount a directory to a route.
  logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
  middleware: [
    function (req, res, next) {
      const url = req.url;
      if (
        req.url.startsWith('/dist') &&
        !(req.url.endsWith('.js') || req.url.endsWith('.css'))
      ) {
        req.url += '.js';
        console.log(`Rewriting ${url} -> ${req.url}`);
      } else {
        console.log(`Not rewriting ${req.url}`);
      }
      next();
    },
  ], // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
};
liveServer.start(params);
