import WebSocket from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import upath from 'upath';
import { scriptFileReg, htmlFileReg } from './wrap';

const
  app = express(),
  server = http.createServer(app),
  root = process.cwd(),
  files = new Map(),
  getFileType = path =>
    scriptFileReg.test(path) ? 'script' :
    htmlFileReg.test(path) ? 'template' :
    'unknown';

app.get('*.(js|map)', (req, res) => {
  const src = req.path.replace(/^\//, '');
  console.log('request', src, files.has(src));
  if (files.has(src)) {
    res.send(files.get(src));
  } else {
    res.status(404).send({
      error: 'Not Found',
    });
  }
});

function start(port) {
  server.listen(port, () => {});

  const wss = new WebSocket.Server({
    server,
  });

  return {
    reload(filePath, file, sourceMap) {
      const src = upath.toUnix(path.relative(root, filePath));
      console.log(filePath);
      const fileType = getFileType(filePath);

      if (fileType === 'script') {
        if (sourceMap) {
          const sourceMapWithRelativePaths = Object.assign(
              {},
              sourceMap,
              {
              // Debug
                sources: ['fade.component.js'],
              },
          );
          const sourceMapStr = JSON.stringify(sourceMapWithRelativePaths);
          const base64 = Buffer.from(sourceMapStr).toString('base64');
          file +=
            `\n//# sourceMappingURL=data:application/json;base64,${base64}`;
        }
        // The client loads scripts using normal script tags,
        // not eval etc, so we just need to store the file
        // and let client.tpl.js and the express app defined
        // above do the rest.
        files.set(src, file);
      }

      wss.clients.forEach(client => {
        if (client.readyState = WebSocket.OPEN) {
          client.send(JSON.stringify({
            message: 'reload',
            fileType,
            filePath,
            src,
          }));
        }
      });
    },
  };
}

export {
  start,
};
