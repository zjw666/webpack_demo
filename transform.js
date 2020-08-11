const fs = require('fs');
const {parse} = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const types = require('@babel/types');
const path = require('path');
const babel = require('@babel/core');

/* 收集当前文件的依赖，并将导入代码转换为__My_Webpack_Require__, 且替换相对路径，具体规则如下
  规则1： import {a, b} from './file1.js' => let {a: a, b: b} = __My_Webpack_Require__('./src/file1.js')

  规则2：import c from './file2.js' => let {default: c} = __My_Webpack_Require__('./src/file1.js')

  规则3：import('./file3.js').then(xxx)  => __My_Webpack_Require__.e(moduleId).then(__My_Webpack_Require__.bind(null, "./src/file3.js")).then(xxx)
*/
function getModuleInfo(file) {
  let code = fs.readFileSync(file, 'utf-8');
  let ast = parse(code, {
    sourceType: 'module'
  });

  const deps = {};     //收集同步加载的依赖
  const asyncDeps = {};  //收集异步加载的依赖
  let hasDeps = false;   //标记当前文件是否有依赖

  traverse(ast, {
    ImportDeclaration(pathObj) {    //规则1，规则2
      let dirname = path.dirname(file);
      let absPath = "./" + path.join(dirname, pathObj.node.source.value).replace(/\\/g, '/');
      deps[pathObj.node.source.value] = absPath;
      hasDeps = true;


      let newNode = types.variableDeclaration("let", [
        types.variableDeclarator(
          types.objectPattern(pathObj.node.specifiers.map(item => {
            return types.objectProperty(types.identifier(item.imported ? item.imported.name : 'default'), types.identifier(item.local.name))
          })),
          types.callExpression(types.identifier('__My_Webpack_Require__'), [types.stringLiteral(absPath)])
        )
      ]);

      pathObj.replaceWith(newNode);
    },

    Import: {
      exit(pathObj) {   //规则3
        if (types.isCallExpression(pathObj.parent)) {

          let dirname = path.dirname(file);
          let absPaths = [];
          for (let {value} of pathObj.parent.arguments) {
            let absPath = "./" + path.join(dirname, value).replace(/\\/g, '/');
            asyncDeps[value] = absPath;
            hasDeps = true;
            absPaths.push(types.stringLiteral(absPath));
          }

          let newNode = types.callExpression(
            types.memberExpression(
              types.callExpression(
                types.memberExpression(
                  types.identifier('__My_Webpack_Require__'),
                  types.identifier('e')
                ),
                absPaths
              ),
              types.identifier('then')),
            [
              types.callExpression(
                types.memberExpression(types.identifier('__My_Webpack_Require__'), types.identifier('bind')),
                [types.nullLiteral(), ...absPaths]
              )
            ]
          );

          pathObj.parentPath.replaceWith(newNode);
        }
      }
    }
  });

  let {code: resultCode} = babel.transformFromAst(ast, null, {   //将ES6转换为ES5的语法
    presets:["@babel/preset-env"]
  });

  return {code: resultCode, file, deps, asyncDeps, id: getFileId(file), hasDeps};
}

// 获取文件的uniqueId, 以dev和ino为标识
function getFileId(file) {
  let fileStatus = fs.statSync(file);
  return `${fileStatus.dev}-${fileStatus.ino}`;
}

//递归收集文件的依赖
function getFilesDepends(file, modules, asyncModules, visited, type) {
  let fileId = getFileId(file);
  let uniqueId = `${type}-${fileId}`;
  if (visited[uniqueId]) return;

  let entry = getModuleInfo(file);
  visited[uniqueId] = file;

  if (type === 'sync') {
    modules.push(entry);
  } else {
    asyncModules.push(entry);
    entry.asyncIndex = asyncModules.length - 1;
  }


  let {deps = {}, asyncDeps = {}} = entry;

  for (let key in deps) {
    if (deps.hasOwnProperty(key)) {
      getFilesDepends(deps[key], modules, asyncModules, visited, 'sync')
    }
  }

  if (!entry.asyncMap) entry.asyncMap = {};
  for (let key in asyncDeps) {
    if (asyncDeps.hasOwnProperty(key)) {
      entry.asyncMap[asyncDeps[key]] = asyncModules.length;
      getFilesDepends(asyncDeps[key], modules, asyncModules, visited, 'async')
    }
  }
}

// 收集所有文件的依赖，并整理chunk代码，将异步的文件路径替换为索引
function parseAll(file) {
  let modules = [];
  let asyncModules = [];
  let visited = {};
  getFilesDepends(file, modules, asyncModules, visited, 'sync');

  modules = modules.map((item) => {
    item.code = item.code.replace(/__My_Webpack_Require__.e\((?:[\"\'])([\w\.\/]+)(?:[\"\'])\)/g, (match, p1) => `__My_Webpack_Require__.e(${item.asyncMap[p1]})`);
    let args = item.hasDeps ? ['module', 'exports', '__My_Webpack_Require__', item.code] : ['module', 'exports', item.code];
    return `"${item.file.replace(/\\/g, '/')}":
          (${new Function(...args).toString()})`;
  });

  asyncModules = asyncModules.map((item) => {
    item.code = item.code.replace(/__My_Webpack_Require__.e\((?:[\"\'])([\w\.\/]+)(?:[\"\'])\)/g, (match, p1) => `__My_Webpack_Require__.e(${item.asyncMap[p1]})`);
    let args = item.hasDeps ? ['module', 'exports', '__My_Webpack_Require__', item.code] : ['module', 'exports', item.code];
    let fileId = item.file.replace(/\\/g, '/');
    return [[item.asyncIndex],`
    (window["webpackJsonp"] = window["webpackJsonp"] || []).push([
        [${item.asyncIndex}],
       {
          "${fileId}":
          (${new Function(...args).toString()})
       }
    ]);\n\n`
    ];
  });

  return {modules, asyncModules};
}

//拼接字符串，生成最终代码
function bundle(config) {
  let {entry, output: {filename, path, publicPath}} = config;
  let {modules, asyncModules} = parseAll(entry);

  const code = `
(function(modules) {

  ${asyncModules.length > 0 ?
  `
  // 将对应的chunk代码加载进入modules，若为异步chunk，还返回resolve的promise
  function webpackJsonpCallback(data) {
    var chunkIds = data[0];
    var moreModules = data[1];


    // add "moreModules" to the modules object,
    // then flag all "chunkIds" as loaded and fire callback
    var moduleId, chunkId, i = 0, resolves = [];
    for(;i < chunkIds.length; i++) {
      chunkId = chunkIds[i];
      if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
        resolves.push(installedChunks[chunkId][0]);
      }
      installedChunks[chunkId] = 0;
    }
    for(moduleId in moreModules) {
      if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
        modules[moduleId] = moreModules[moduleId];
      }
    }
    if(parentJsonpFunction) parentJsonpFunction(data);

    while(resolves.length) {
      resolves.shift()();
    }
  };

  var installedChunks = {
    "main": 0
  };

  function jsonpScriptSrc(chunkId) {
  	return __My_Webpack_Require__.p + "" + ({}[chunkId]||chunkId) + ".bundle.js"
  }
  ` : ''
  }

  var installedModules = {};

  function __My_Webpack_Require__(moduleId) {
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }

    var module = installedModules[moduleId] = {
      i: moduleId,
      l: false,
      exports: {}
    };

    modules[moduleId].call(module.exports, module, module.exports, __My_Webpack_Require__);

    module.l = true;

    return module.exports;
  }

  __My_Webpack_Require__.p = "${publicPath}";

  ${asyncModules.length > 0 ?
    `
    __My_Webpack_Require__.e = function requireEnsure(chunkId) {
    	var promises = [];


   	  // JSONP chunk loading for javascript

   	  var installedChunkData = installedChunks[chunkId];
    	if(installedChunkData !== 0) { // 0 means "already installed".

   		// a Promise means "currently loading".
    		if(installedChunkData) {
    			promises.push(installedChunkData[2]);
    		} else {
    			// setup Promise in chunk cache
    			var promise = new Promise(function(resolve, reject) {
    				installedChunkData = installedChunks[chunkId] = [resolve, reject];
    			});
    			promises.push(installedChunkData[2] = promise);

   			// start chunk loading
    			var script = document.createElement('script');
    			var onScriptComplete;

   			  script.charset = 'utf-8';
          script.timeout = 120;
          script.src = jsonpScriptSrc(chunkId);

   			// create error before stack unwound to get useful stacktrace later
    			var error = new Error();
    			onScriptComplete = function (event) {
    				// avoid mem leaks in IE.
    				script.onerror = script.onload = null;
    				clearTimeout(timeout);
    				var chunk = installedChunks[chunkId];
    				if(chunk !== 0) {
    					if(chunk) {
    						var errorType = event && (event.type === 'load' ? 'missing' : event.type);
    						var realSrc = event && event.target && event.target.src;
    						error.message = 'Loading chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')';
    						error.name = 'ChunkLoadError';
    						error.type = errorType;
    						error.request = realSrc;
    						chunk[1](error);
    					}
    					installedChunks[chunkId] = undefined;
    				}
    			};
    			var timeout = setTimeout(function(){
    				onScriptComplete({ type: 'timeout', target: script });
    			}, 120000);
    			script.onerror = script.onload = onScriptComplete;
    			document.head.appendChild(script);
    		}
    	}
    	return Promise.all(promises);
    };

    // 加载非异步的chunk
    var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
   	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
   	jsonpArray.push = webpackJsonpCallback;                           //劫持数组的原push方法
   	jsonpArray = jsonpArray.slice();
   	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
   	var parentJsonpFunction = oldJsonpFunction;                       //保存数组的原push方法
    ` : ''
  }

  return __My_Webpack_Require__('${entry}');
})(
  {
  ${modules.join(',\n')}
  }
);
`
  fs.mkdirSync(path);
  fs.writeFileSync(`${path}/${filename}`, code);
  asyncModules.forEach((item) => {
    fs.writeFileSync(`${path}/${item[0]}.bundle.js`, item[1]);
  });
}

bundle({
  entry: './src/index.js',
  output: {
    filename: 'myBundle.js',
    path: path.resolve(__dirname, 'dist1'),
    publicPath: './dist1/'
  }
});