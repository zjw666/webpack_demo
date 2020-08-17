const { compilation } = require("webpack");

const fs = require('fs');
const { Console } = require("console");
const output = fs.createWriteStream('./stdout.log');
const errOutput = fs.createWriteStream("./stderr.log");
const logger = new Console({
  stdout: output,
  stderr: errOutput
})

class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap('test', (compilation) => {
      compilation.chunks.forEach((chunk, index) => {
        logger.log(`chunk${index}:`, chunk);

        chunk.getModules().forEach((module, index1) => {
          logger.log(`chunk${index}-module${index1}:`, module);
        });

        chunk.files.forEach(filename => {
          logger.log(`file(${filename}):`, compilation.assets[filename].source())
        })
      });
    })
  }
}

module.exports = MyPlugin;