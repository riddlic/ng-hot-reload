import wrapTemplate from 'raw-loader!./wrap.tpl.js';
import { templates } from 'ng-hot-reload-core';

const
  scriptFileReg = /\.(js|jsx|ts|tsx)$/,
  htmlFileReg = /\.(html)$/;

export default ({
  firstPassed,
  port,
  angular,
}) => (path, file) => {
  const options = JSON.stringify({
    ns: 'ng-hot-reload-standalone',
    firstPassed,
    port,
  });

  if (scriptFileReg.test(path)) {
    return `(function(__ngHotReloadOptions) {
      ${wrapTemplate}
      ` +
      file +
      `
      })(function(angular) {
          var options = ${options};
          options.angular = ${angular};
          return options;
      }(${angular}));
      `;
  } else if (htmlFileReg.test(path)) {
    return file + '\n' +
      templates.filePathCommentPrefix +
      path + templates.filePathCommentSuffix;
  } else {
    return file;
  }
};

export {
  scriptFileReg,
  htmlFileReg,
};