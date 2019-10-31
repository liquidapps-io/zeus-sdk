const fs = require('fs');
const { execPromise, emojMap } = require('../../helpers/_exec');
var tidyChecks = ['*'];
var path = require('path');
var CMakeLists = (vcpu) => `get_filename_component(PROJ_NAME "\${CMAKE_CURRENT_SOURCE_DIR}" NAME )
cmake_minimum_required(VERSION 3.5)
set(EOSIO_WASM_OLD_BEHAVIOR "Off")
project(\${PROJ_NAME} VERSION 1.0.0)
if(EOSIO_CDT_ROOT STREQUAL "" OR NOT EOSIO_CDT_ROOT)
   find_package(eosio.cdt)
endif()
add_contract( \${PROJ_NAME} \${PROJ_NAME} \${PROJ_NAME}.cpp )
include_directories( \${PROJ_NAME} PUBLIC ./ )

${vcpu ? `
include(ExternalProject)
ExternalProject_Add(
               \${PROJ_NAME}-vcpu
               SOURCE_DIR vcpu
               BINARY_DIR vcpu
               CMAKE_ARGS -DCMAKE_TOOLCHAIN_FILE=\${EOSIO_CDT_ROOT}/lib/cmake/eosio.cdt/EosioWasmToolchain.cmake
               UPDATE_COMMAND ""
               PATCH_COMMAND ""
               TEST_COMMAND ""
               INSTALL_COMMAND ""
               BUILD_ALWAYS 1
            )` :''}
`;
var CMakeListsVCPU = (vcpuconsumer) => `cmake_minimum_required(VERSION 3.5)
set(EOSIO_WASM_OLD_BEHAVIOR "Off")
project(${vcpuconsumer} VERSION 1.0.0)
find_package(eosio.cdt)
set(VCPUWASM "${vcpuconsumer}-VCPU.wasm")
include_directories(../)
add_executable(\${VCPUWASM} ../${vcpuconsumer}.cpp)
set_target_properties( \${VCPUWASM} PROPERTIES LINK_FLAGS "-fquery-server" SUFFIX "" )
target_compile_options( \${VCPUWASM} PUBLIC -fquery-server )`
module.exports = async(args, zeusbox) => {
    if (zeusbox.install && zeusbox.install.contracts) {
        await Promise.all(Object.keys(zeusbox.install.contracts).map(async contract => {
            var enabledVCPU = zeusbox.install.vcpu_contracts && zeusbox.install.vcpu_contracts[contract]
            console.log(emojMap.eight_spoked_asterisk + `Configuring ${contract.green} ${enabledVCPU ? '+VCPU'.blue : ''}`);

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
            if (fs.existsSync(contractDir) && !fs.existsSync(contractMakeFile)) { fs.writeFileSync(contractMakeFile, CMakeLists(enabledVCPU)); }

            if (enabledVCPU) {

                var vcpuDir = path.join(contractDir, 'vcpu');
                if (!fs.existsSync(vcpuDir)) {
                    fs.mkdirSync(vcpuDir);
                }
                var vcpuMakeFile = path.join(vcpuDir, 'CMakeLists.txt');
                fs.writeFileSync(vcpuMakeFile, CMakeListsVCPU(contract));
            }
        }));
    }
};
