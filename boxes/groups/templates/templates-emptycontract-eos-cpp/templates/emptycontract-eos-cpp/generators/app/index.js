'use strict';
/* eslint-disable */
var Generator = require('yeoman-generator');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = class extends Generator {
    // The name `constructor` is important here
    constructor(args, opts) {
        // Calling the super constructor is important so our generator is correctly set up
        super(args, opts);
        this.argument('contractname', { type: String, required: true });
    }

    write1() {
        var name = _.kebabCase(this.options.contractname);
        this.fs.copyTpl(
            this.templatePath('**'),
            this.destinationPath(`contracts/eos/${name}/`),
            this.options
        );

        this.fs.copyTpl(
            path.resolve('./templates/emptycontract-eos-cpp/generators/app/test-templates/contract.spec.js'),
            this.destinationPath(`test/${name}.contract.spec.js`),
            this.options
        );



        // append to cmakelists
        const originalContent = fs.readFileSync(this.destinationPath('', 'contracts/eos/CMakeLists.txt'), 'utf8');
        if (originalContent.split('\n').indexOf(`# building:${name}`) !== -1) { return; }
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
};
