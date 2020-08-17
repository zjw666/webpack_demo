const loaderUtils = require('loader-utils');

module.exports =  function loader(source) {

  console.log(source);

  const {funcName} = loaderUtils.getOptions(this);

  console.log(funcName);

  return source.replace(/console.log/g, funcName);;
}