
(function(modules) {

  
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

  __My_Webpack_Require__.p = "./dist1/";

  
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
    						error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
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
    

  return __My_Webpack_Require__('./src/index.js');
})(
  {
  "./src/index.js":
          (function anonymous(module,exports,__My_Webpack_Require__
) {
"use strict";

var _My_Webpack_Require_ = __My_Webpack_Require__("./src/helper/add.js"),
    multiply = _My_Webpack_Require_.multiply;

var _My_Webpack_Require_2 = __My_Webpack_Require__("./src/add.js"),
    add1 = _My_Webpack_Require_2.add1;

__My_Webpack_Require__.e(0).then(__My_Webpack_Require__.bind(null, "./src/minus.js")).then(function (_ref) {
  var minus = _ref["default"];
  console.log(minus(4, 1));
});

var b = add1(1, 1);
var c = multiply(1, 2);
console.log(b, c);
}),
"./src/helper/add.js":
          (function anonymous(module,exports
) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.multiply = exports.add = void 0;

var add = function add(a, b) {
  return a + b;
};

exports.add = add;

var multiply = function multiply(a, b) {
  return a * b;
};

exports.multiply = multiply;
}),
"./src/add.js":
          (function anonymous(module,exports,__My_Webpack_Require__
) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.add1 = void 0;

var _My_Webpack_Require_ = __My_Webpack_Require__("./src/helper/add.js"),
    add = _My_Webpack_Require_.add;

var add1 = function add1(a, b) {
  return add(a, b);
};

exports.add1 = add1;
})
  }
);
