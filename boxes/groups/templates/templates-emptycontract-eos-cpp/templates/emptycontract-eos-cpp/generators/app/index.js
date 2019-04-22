'use strict';

var yeoman = require('yeoman-generator');
const _ = require('lodash');
const fs = require('fs');

module.exports = yeoman.generators.Base.extend({
    // The name `constructor` is important here
    constructor: function(args, opts) {
        yeoman.generators.Base.apply(this, arguments);

        this.argument("contractname", { type: String, required: true });
    },
    write1: function() {
        var name = _.kebabCase(this.options.contractname);
        this.fs.copyTpl(
            this.templatePath('**'),
            this.destinationPath(`contracts/eos/${name}/`),
            this.options
        );

        // append to cmakelists
        const originalContent = fs.readFileSync(this.destinationPath('', 'contracts/eos/CMakeLists.txt'), 'utf8');
        if (originalContent.split("\n").indexOf(`# building:${name}`) !== -1)
            return;
        const toAppendContent = `\n
# building:${name}\n
ExternalProject_Add(
   ${name}
   SOURCE_DIR ${name}
   BINARY_DIR ${name}
   CMAKE_ARGS -DCMAKE_TOOLCHAIN_FILE=\${EOSIO_CDT_ROOT}/lib/cmake/eosio.cdt/EosioWasmToolchain.cmake
   UPDATE_COMMAND ""
   PATCH_COMMAND ""
   TEST_COMMAND ""
   INSTALL_COMMAND ""
   BUILD_ALWAYS 1
)\n`;
        fs.writeFileSync(this.destinationPath('', 'contracts/eos/CMakeLists.txt'), originalContent.concat(toAppendContent));
    }
});
