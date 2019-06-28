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
        this.argument('servicename', { type: String, required: true });

    }

    write1() {
        var name = _.kebabCase(this.options.servicename);
        this.options.consumercontractname = `${name}consumer`;
        this.options.serviceuppername = this.options.servicename.toUpperCase();

        this.fs.copyTpl(
            this.templatePath('**'),
            this.destinationPath(`contracts/eos/${name}consumer/`),
            this.options
        );

        this.fs.copyTpl(
            path.resolve('./templates/dsp-service/generators/app/test-templates/consumer.spec.js'),
            this.destinationPath(`test/${name}consumer.spec.js`),
            this.options
        );
        this.fs.copyTpl(
            path.resolve('./templates/dsp-service/generators/app/model-template/model.json'),
            this.destinationPath(`models/dapp-services/${name}.json`),
            this.options
        );



        // append to cmakelists
        const originalContent = fs.readFileSync(this.destinationPath('', 'contracts/eos/CMakeLists.txt'), 'utf8');
        if (originalContent.split('\n').indexOf(`# building:${name}`) !== -1) { return; }
        const toAppendContent = `\n
# building:${name}\n
ExternalProject_Add(
   ${name}consumer
   SOURCE_DIR ${name}consumer
   BINARY_DIR ${name}consumer
   CMAKE_ARGS -DCMAKE_TOOLCHAIN_FILE=\${EOSIO_CDT_ROOT}/lib/cmake/eosio.cdt/EosioWasmToolchain.cmake
   UPDATE_COMMAND ""
   PATCH_COMMAND ""
   TEST_COMMAND ""
   INSTALL_COMMAND ""
   BUILD_ALWAYS 1
)\n
ExternalProject_Add(
   ${name}service
   SOURCE_DIR ${name}service
   BINARY_DIR ${name}service
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
