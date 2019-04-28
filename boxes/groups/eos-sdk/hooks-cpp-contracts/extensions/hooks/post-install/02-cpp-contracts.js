const fs = require('fs');
const { execPromise, emojMap } = require('../../helpers/_exec');
var tidyChecks = ['*'];
var path = require('path');
var CMakeLists = `get_filename_component(PROJ_NAME "\${CMAKE_CURRENT_SOURCE_DIR}" NAME )
cmake_minimum_required(VERSION 3.5)
set(EOSIO_WASM_OLD_BEHAVIOR "Off")
project(\${PROJ_NAME} VERSION 1.0.0)
if(EOSIO_CDT_ROOT STREQUAL "" OR NOT EOSIO_CDT_ROOT)
   find_package(eosio.cdt)
endif()
add_contract( \${PROJ_NAME} \${PROJ_NAME} \${PROJ_NAME}.cpp )
include_directories( \${PROJ_NAME} PUBLIC ./ )
`;
module.exports = async (args, zeusbox) => {
  if (zeusbox.install && zeusbox.install.contracts) {
    await Promise.all(Object.keys(zeusbox.install.contracts).map(async contract => {
      console.log(emojMap.eight_spoked_asterisk + `Configuring ${contract.green}`);

      var fileName = './contracts/eos/CMakeLists.txt';
      var cmakelists = '';
      if (fs.existsSync(fileName)) { cmakelists = fs.readFileSync(fileName).toString(); }
      cmakelists += `\nExternalProject_Add(
               ${contract}
               SOURCE_DIR ${contract}
               BINARY_DIR ${contract}
               CMAKE_ARGS -DCMAKE_TOOLCHAIN_FILE=\${EOSIO_CDT_ROOT}/lib/cmake/eosio.cdt/EosioWasmToolchain.cmake
               UPDATE_COMMAND ""
               PATCH_COMMAND ""
               TEST_COMMAND ""
               INSTALL_COMMAND ""
               BUILD_ALWAYS 1
            )\n`;
      fs.writeFileSync(fileName, cmakelists);
      var contractDir = path.join('./contracts/eos/', contract);
      var contractMakeFile = path.join(contractDir, 'CMakeLists.txt');
      if (fs.existsSync(contractDir) && !fs.existsSync(contractMakeFile)) { fs.writeFileSync(contractMakeFile, CMakeLists); }
    }));
  }
};
