import wrapTemplate from 'raw-loader!./wrap.tpl.js';
import { template } from 'ng-hot-reload-core';
import { SourceMapConsumer, SourceNode } from 'source-map';

const
  scriptFileReg = /\.(js|jsx|ts|tsx)$/,
  htmlFileReg = /\.(html)$/;

export default (path, file, options, sourceMap) => {
  const optionsStr = JSON.stringify(Object.assign({
    ns: 'ngHotReloadStandalone',
  }, options));
  const angular = options.angular || 'angular';

  if (scriptFileReg.test(path)) {
    const topPart = (options.prependCode || '') + `;
      (function(__ngHotReloadOptions) {
        ${wrapTemplate}
      `;
    const bottomPart = `
      })(function(angular) {
          var options = ${optionsStr};
          options.angular = angular;
          return options;
      }(${angular}));`;

    if (!sourceMap) {
      // No need to generate source maps, just return concatenated
      // library code and original file contents synchronously.
      return topPart + file + bottomPart;
    }

    // Create source maps (asynchronously) and return results through a promise.
    return SourceMapConsumer.with(sourceMap, null, (consumer) => {
      const node = SourceNode.fromStringWithSourceMap(file, consumer);
      node.prepend(topPart);
      node.add(bottomPart);
      const result = node.toStringWithSourceMap();
      const newMap = result.map.toJSON();
      console.log('in', path, sourceMap, newMap);
      return {
        code: result.code,
        map: newMap,
      };
    });
  } else if (htmlFileReg.test(path)) {
    return file +
      template.getTemplatePathPrefix() +
      path +
      template.getTemplatePathSuffix();
  } else {
    return file;
  }
};

export {
  scriptFileReg,
  htmlFileReg,
};
