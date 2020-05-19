const fs = require('fs');
const { createDir, requireBox } = require('@liquidapps/box-utils');
const { execPromise, emojMap } = requireBox('seed-zeus-support/_exec');
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
            )` : ''}
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

module.exports = async (args, zeusbox) => {
    createDir('contracts/eos', 'contracts/eos');
    if (zeusbox.install && zeusbox.install.contracts) {
        let cmakelists = `project(eoscontract NONE)
        cmake_minimum_required(VERSION 3.5)
        
        set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
        
        include(ExternalProject)
        # if no cdt root is given use default path
        if(EOSIO_CDT_ROOT STREQUAL "" OR NOT EOSIO_CDT_ROOT)
           find_package(eosio.cdt)
        endif()`;
        await Promise.all(Object.keys(zeusbox.install.contracts).map(async contract => {
            const enabledVCPU = zeusbox.install.vcpu_contracts && zeusbox.install.vcpu_contracts[contract]
            console.log(emojMap.eight_spoked_asterisk + `Configuring ${contract.green} ${enabledVCPU ? '+VCPU'.blue : ''}`);
            const cmakelistsPath = '../contracts/eos/CMakeLists.txt';
            if (fs.existsSync(cmakelistsPath)) { cmakelists = fs.readFileSync(cmakelistsPath).toString(); }
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
            fs.writeFileSync(cmakelistsPath, cmakelists);
            const contractDir = path.join(`../contracts/eos/`, contract);
            const contractMakeFile = path.join(contractDir, 'CMakeLists.txt');
            if (fs.existsSync(contractDir) && !fs.existsSync(contractMakeFile)) { fs.writeFileSync(contractMakeFile, CMakeLists(enabledVCPU)); }

            if (enabledVCPU) {

                const vcpuDir = path.join(contractDir, 'vcpu');
                if (!fs.existsSync(vcpuDir)) {
                    fs.mkdirSync(vcpuDir);
                }
                const vcpuMakeFile = path.join(vcpuDir, 'CMakeLists.txt');
                fs.writeFileSync(vcpuMakeFile, CMakeListsVCPU(contract));
            }
        }));
    }
};