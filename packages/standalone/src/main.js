import wrapFile, { scriptFileReg } from './wrap';
import * as server  from './server';
import through      from 'through2';

import clientTemplate from 'raw-loader!./client.tpl.js';
import coreLib        from 'raw-loader!ng-hot-reload-core';

const moduleRegex = /(\/|\\)(node_modules|bower_components)(\/|\\)/;

export default function ngHotReloadStandalone({
  start = true,
  port = 3100,
  angular = 'angular',
  forceRefresh = true,
  preserveState = true,
} = {}) {
  const wrapOptions = {
    angular,
    forceRefresh,
    preserveState,
    port,
  };
  const wrap = (path, file, prepend, sourceMap) => wrapFile(
      path, file,
      Object.assign({ prependCode: prepend }, wrapOptions),
      sourceMap,
  );

  let fileServer;
  function startServer() {
    fileServer = server.start(port);
  }

  /**
   * Reload changed file.
   * @param {string} path Path to the file.
   * @param {string} file File contents.
   * @param {string | null | undefined} [sourceMap] Generated source map
   */
  function reload(path, file, sourceMap) {
    fileServer.reload(path, file, sourceMap);
  }

  /**
   * Creates a consumer for gulp file streams.
   *
   * The source files need to be wrapped using the `wrap` function
   * on the first load and then passed to `reload` function
   * when there's a change.
   *
   * This function can be used in place or with the normal `reload`
   * and `wrap` functions, for the initial load of the
   * files or for the subsequent reloads of those files,
   * or both.
   *
   * @param {object=} options Options for the consumer.
   *      If omitted, defaults to all options being true.
   * @param {boolean=} [options.initial=true] Use this stream to
   *      wrap the files during the initial load.
   * @param {boolean=} [options.reload=true] Use this stream to
   *      handle the reloads.
   * @param {boolean=} [options.includeClient=true] Use this stream to
   *      include the runtime client. The client is prepended to the
   *      first "valid" file that passes through. Note that if you
   *      set this option to `false`, you need to manually include the file
   *      so that it gets executed before other hot-loaded files.
   * @param {boolean=} [options.ignoreModules] Ignore files that
   *      are in node_modules or bower_components.
   * @return {*} Handler for gulp streams.
   */
  function stream({
    includeClient = true,
    ignoreModules = true,
  } = {}) {
    let clientIncluded = false;

    return through.obj(function(file, enc, cb) {
      if (ignoreModules && moduleRegex.test(file.path)) {
        // Ignore node_modules etc
        cb(null, file);
        return;
      }

      let prependCode;
      if (scriptFileReg.test(file.path) && includeClient && !clientIncluded) {
        clientIncluded = true;
        prependCode = client;
      }
      const contents = wrap(
          file.path, String(file.contents),
          prependCode,
          file.sourceMap,
      );

      function done(result) {
        if (fileServer) {
          reload(file.path, result.code, result.map);
        }

        file.contents = file.isBuffer() ?
          Buffer.from(result.code, enc) :
          result.code;
        if (result.map) {
          file.sourceMap = result.map;
        }

        cb(null, file);
      }

      // Result is a string if there was no source map, Promise otherwise.
      if (typeof contents === 'string') {
        done({ code: contents });
      } else {
        contents.then(done);
      }
    });
  }

  const clientOptions = {
    ns: 'ngHotReloadStandalone',
    port,
  };

  const client =
    `;(function(options) {
        options.root = typeof window !== 'undefined' ? window : this;
        if (options.root) {
            if (options.root[options.ns]) return;
            else options.root[options.ns] = {};
        }

        ${clientTemplate}

        var module;
        var exports = options.root[options.ns];
        // Webpack's generated output for ng-hot-reload-core will load
        // the exports to options.root[options.ns].ngHotReloadCore
        ${coreLib}

    })(${ JSON.stringify(clientOptions) });
    `;

  if (start) {
    startServer();
  }

  return {
    start: startServer,
    wrap,
    client,
    stream,
    reload(path, file) {
      const wrapped = wrap(path, String(file));
      reload(path, wrapped);
      return wrapped;
    },
  };
};
