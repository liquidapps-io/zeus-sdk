<template>
  <div
    id="app"
    :class=" { mobile: isMobile, 'multi-file-mode' : multiMode, 'menu-open': menuOpen, 'frame-mode' : frameMode, 'mobile-mode' : isMobile , 'theme-eclipse': currentTheme == 'eclipse'  }"
    :theme="currentTheme"
  >
    <header id="nav" v-if="!frameMode">
      <h1 id="logo-block">
        <router-link to="/">
          <span style="margin-left:5px" class="logo-name">Zeus IDE</span>
        </router-link>
      </h1>
      <div id="actions">
        <nav class="actionCont collapsed">
          <div class="action-item" id="deploy-code">
            <a class="ai-button" @click="deployCode()" v-if="!projectId">
              <v-icon name="paper-plane" scale="0.9"/>Compile & Deploy
            </a>
          </div>
          <div class="action-item" id="run-code">
            <a class="ai-button" @click="runCode()">
              <v-icon name="play" scale="0.8"/>Run
            </a>
          </div>

          <Dropdown class="dropdown action-item" v-if="projectType == 'eos' && projectId">
            <a class="dropdown-toggle ai-button" @click="embedCode()" slot="button">
              <v-icon name="share-alt" scale="0.8"/>Embed
            </a>
            <ul
              class="dropdown-menu dropdown-menu-actions round dropdown-menu-left"
              slot="dropdown"
            >
              <div class="dropdown-container net-settings embed">
                <div id="creator">
                  <section>
                    <h3>Tabs:</h3>
                    <div class="inlineFields">
                      <label class="input-checkbox checkboxCont">
                        <input type="checkbox" name="tabs" value="js" checked>
                        Contract
                      </label>
                      <label class="input-checkbox checkboxCont">
                        <input type="checkbox" name="tabs" value="html" checked>
                        ABI
                      </label>
                      <label class="input-checkbox checkboxCont">
                        <input type="checkbox" name="tabs" value="css" checked>
                        Client
                      </label>
                      <label class="input-checkbox checkboxCont">
                        <input type="checkbox" name="tabs" value="result" checked>
                        Result
                      </label>
                    </div>
                    <!-- /inlineFields -->
                  </section>

                  <section class="noborder">
                    <h3>Visual:</h3>
                    <div class="inline-fields">
                      <label class="input-checkbox checkboxCont">
                        <input type="radio" v-model="embedConfig.theme" value="eclipse">
                        <span class="radio"></span> Light
                      </label>
                      <label class="input-checkbox checkboxCont">
                        <input type="radio" v-model="embedConfig.theme" value="darcula">
                        <span class="radio"></span> Dark
                      </label>
                    </div>
                    <!-- /inlineFields -->
                    <template v-if="0">
                      <label class="input-text">
                        <input
                          type="text"
                          name="accentColor"
                          maxlength="7"
                          placeholder="Accent color"
                        >
                      </label>
                      <label class="input-text">
                        <input type="text" name="fontColor" maxlength="7" placeholder="Font color">
                      </label>
                      <label class="input-text">
                        <input
                          type="text"
                          name="menuColor"
                          maxlength="7"
                          placeholder="Menu background"
                        >
                      </label>
                      <label class="input-text">
                        <input
                          type="text"
                          name="bodyColor"
                          maxlength="7"
                          placeholder="Code background"
                        >
                      </label>
                    </template>
                  </section>

                  <section class="noborder">
                    <h3>
                      Embed snippet
                      :
                    </h3>
                    <div class="embedCodeWrap hidden">
                      <textarea class="embedCode"><iframe width="100%" height="300" src="{{emebedFrameURL}}" allowfullscreen allowpaymentrequest frameborder="0"></iframe>
                            </textarea>
                      <p>
                        <strong>No autoresizing</strong> to fit the code
                      </p>
                      <p>
                        <strong>Render blocking</strong> of the parent page
                      </p>
                    </div>
                  </section>
                </div>
                <div id="preview">
                  <iframe
                    width="100%"
                    height="300"
                    frameborder="0"
                    sandbox="allow-modals allow-forms allow-scripts allow-same-origin allow-popups"
                    allow="midi; geolocation; microphone; camera; encrypted-media;"
                    :src="emebedFrameURL"
                  ></iframe>
                </div>
              </div>
            </ul>
          </Dropdown>

          <div class="action-item" v-if="projectType == 'eos' && !projectId" id="save-project">
            <a class="ai-button" @click="saveProject()">
              <v-icon name="save" scale="0.8"/>Save
            </a>
          </div>

          <div class="action-item" v-if="isMobile" style="margin: 0;">
            <a class="ai-button" @click="menuOpen = !menuOpen">
              <v-icon name="list" scale="0.8"/>
            </a>
          </div>
        </nav>

        <ul class="right">
          <Dropdown
            class="dropdown action-item work-status"
            v-if="projectType == 'eos' && !projectId"
          >
            <a class="dropdown-toggle ai-button" slot="button">
              <span class="draft">Draft</span>
            </a>
            <ul
              class="dropdown-menu dropdown-menu-actions round dropdown-menu-right"
              slot="dropdown"
            ></ul>
          </Dropdown>

          <Dropdown class="dropdown action-item" v-if="false">
            <a class="dropdown-toggle ai-button" slot="button">
              <v-icon name="server" scale="0.8"/>CompileServer: tbd
            </a>
            <ul
              class="dropdown-menu dropdown-menu-actions round dropdown-menu-right"
              slot="dropdown"
            >
              <div class="dropdown-container net-settings complie-server">
                <h3>Compile Server list</h3>
                <div class="meta-info">
                  <a class="btn btn-link">tbd</a>
                </div>

                <template v-if="false">
                  <h3>Provide Compile Server</h3>
                 
                </template>
              </div>
            </ul>
          </Dropdown>

          <Dropdown class="dropdown action-item dropdown-network-selector">
            <a class="dropdown-toggle ai-button" slot="button">
              <v-icon name="list-ul" scale="0.8"/>
              <template v-if="projectType == 'eos'">
                <!-- Jungle Testnet -->
                {{ currentNetworkInfo.name }}
              </template>
            </a>
            <ul
              class="dropdown-menu dropdown-menu-actions round dropdown-menu-right"
              slot="dropdown"
            >
              <div class="dropdown-container net-settings">
                <h3 class="clearfix network-header">
                  All Network
                  <a
                    class="btn btn-primary pull-right"
                    @click="createNetwork()"
                  >Add Network</a>
                </h3>

                <div class="network-editor" v-if="!networkShowMode">
                  <h3>edit this json config</h3>
                  <textarea
                    style="min-height: 273px;margin-bottom:10px"
                    v-model="customnNetworkConfig"
                  ></textarea>
                  <a class="btn" @click="networkShowMode=true">Back</a>
                  <a class="btn btn-primary" @click="addNetWork()">Add</a>
                </div>
                <div class="network-list-body" v-if="networkShowMode">
                  <div class="network-list">
                    <div
                      v-for="network in networkList"
                      @click="selectNetwork(network)"
                      :key="network.key"
                      class="network-item"
                      :class="{ active: network.key == currentNetwork }"
                    >{{ network.name }}</div>
                  </div>

                  <h3 style="margin: 0 0 15px;">NetWorkInfo</h3>
                  
                  <div class="meta-info" v-if="projectType == 'eos'">
                    <p>Chain ID: {{ currentNetworkInfo.chainId }}</p>
                    <p>
                      Explorer:
                      <a
                        :href="currentNetworkInfo.explorer"
                      >{{ currentNetworkInfo.explorer }}</a>
                    </p>
                    <p>
                      Endpoint:
                      <select v-model="currentHttpEndpoint" style="margin-top:10px">
                        <option v-for="endpoint in allEndpoints" :value="endpoint.ssl_endpoint">
                          {{ endpoint.ssl_endpoint }}
                          <span
                            v-if="endpoint.delay"
                            :style="'margin-left:15px;'+ (endpoint.delay < 1500 ? 'color:green' : 'color:red')"
                          >by {{ endpoint.producer }} speed: {{ endpoint.delay }}ms</span>
                        </option>
                      </select>
                    </p>
                    <p style="color:red">Scatter -> Settings -> NetWorks -> new (import this)</p>
                  </div>

                  
                  <div class="form-info" v-if="projectType == 'eos' && currentNetwork == 'jungle'">
                    <h3>Create Account</h3>
                    <p>
                      <input type="text" placeholder="PublicKey" v-model="pubKey">
                    </p>
                    <p>
                      <input type="text" placeholder="PrivateKey" v-model="privateKey">
                    </p>
                    <a class="btn btn-primary" @click="generateKeyPair()">Create Keypair</a>
                    <a
                      class="btn btn-primary"
                      href="https://monitor.jungletestnet.io/#account"
                      target="_blank"
                    >Go for Create Account</a>
                    <a
                      class="btn btn-primary"
                      href="https://monitor.jungletestnet.io/#faucet"
                      target="_blank"
                    >Faucet (get free eos)</a>
                  </div>

                  <div
                    class="form-info"
                    v-if="projectType == 'eos' && currentNetwork == 'cryptokylin'"
                  >
                    <h3>Create Account</h3>
                    <p>
                      <input type="text" placeholder="Account (12 char)" v-model="registerAccount">
                    </p>
                    <a
                      class="btn btn-primary"
                      :href="'http://faucet.cryptokylin.io/create_account?'+registerAccount"
                      :class=" { disable: !registerAccount}"
                      target="_blank"
                    >Create Account</a>
                    <a
                      class="btn btn-primary"
                      :href="'http://faucet.cryptokylin.io/get_token?'+registerAccount"
                      :class=" { disable: !registerAccount}"
                      target="_blank"
                    >Faucet (get free eos)</a>
                  </div>
                </div>
              </div>
            </ul>
          </Dropdown>

          <Dropdown class="dropdown dropdown-user action-item">
            <a class="dropdown-toggle ai-button" slot="button">

              <template v-if="projectType == 'eos'">
                <img src="./../assets/scatter.png" style="margin-left:6px">
                <span class="el-dropdown-link">
                  <span v-if="scatter && !identity" @click="connectScatter()">Attach an Account</span>
                  <span v-if="scatter && identity">{{ identity.name }}</span>
                  <span v-if="!scatter">
                    <a href="https://get-scatter.com/" target="_blank">Install Scatter</a>
                  </span>
                </span>
              </template>
              <!-- <i class="caret"></i> -->
            </a>
            <ul
              class="dropdown-menu dropdown-menu-actions dropdown-menu-right"
              slot="dropdown"
              v-if="identity"
            >
              <li>
                <a class="text-size-small text-uppercase" @click="signOut()">signOut</a>
              </li>
            </ul>
          </Dropdown>
        </ul>
      </div>
    </header>

    <div id="sidebar">
      <div id="sidebar-main">
        <div class="sidebar-item" id="file-manager">
          <h3 class="toggler" title>
            Files
            <a class="add-file" @click="createFile()">
              <v-icon name="plus" scale="0.5"/>
            </a>
            <a class="add-file">
              <label>
                <v-icon name="folder-open" scale="0.5"/>
                <input type="file" ref="filer" name="fileContent" style="display:none">
              </label>
            </a>
          </h3>
          <div class="body" style="padding-left:0;padding-right:0">
            <ul class="file-list">
              <v-contextmenu ref="contextmenu" @contextmenu="handleFileContextmenu">
                <v-contextmenu-item @click="handleSelectAsMain">Select As Main</v-contextmenu-item>
                <v-contextmenu-item @click="handleRename">Rename</v-contextmenu-item>
                <v-contextmenu-item @click="handleDelete">Delete</v-contextmenu-item>
              </v-contextmenu>
              <li
                v-for="(file, index) in files"
                :class="{ active: currentEditFileName == file.fileName }"
                class="file-item"
                :key="index"
                v-contextmenu:contextmenu
              >
                <div v-if="!file.edit" @click="openFile(file, index)">
                  <span class="file-name">{{ file.fileName }}</span>
                  <strong class="tag-label" v-if="file.isLeader">main</strong>
                </div>
                <div v-if="file.edit">
                  <input type="text" v-model="file.fileName" @keyup.enter="handleEdit(file, index)">
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div class="sidebar-item">
          <h3 class="toggler" title>Project meta</h3>
          <div class="body">
            <p>
              <label>
                <input
                  type="text"
                  name="title"
                  maxlength="255"
                  value
                  placeholder="Untitled contract"
                  v-model="workTitle"
                >
              </label>
            </p>
            <p>
              <label>
                <textarea
                  rows="10"
                  cols="40"
                  name="description"
                  placeholder="No description"
                  v-model="workDesc"
                ></textarea>
              </label>
            </p>

            <template v-if="projectType == 'eos' && 0">
              <p>
                <label>
                  <input type="radio" value="private" v-model="projectStatus"> Private
                </label>
                <label>
                  <input type="radio" value="public" v-model="projectStatus"> Public
                </label>
              </p>

              <p v-if="projectStatus == 'private'">
                <input
                  type="number"
                  maxlength="255"
                  value
                  placeholder="View price (?) EOS"
                  v-model="projectPrice"
                >
              </p>
            </template>
            <!-- <p class="metaInfo">Add title to make the project public</p> -->
          </div>
        </div>
      </div>

      <div id="sidebar-bottom">
        <div class="twitterCont"></div>
      </div>
    </div>

    <div id="content">
      <div
        id="editor"
        v-if="!isMobile && !multiMode"
        :class="{ 'frame-mode' : frameMode, 'mobile-mode' : isMobile }"
      >
        <div class="pannel-main">
          <div class="pannel-piece pannel" style="width: calc(33.3333% - 0.5px);">
            <div class="windowLabelCont">
              <span class="windowLabel" v-if="projectType == 'eos'">cpp</span>
            </div>
            <codemirror v-model="contractCode" :options="contractOptions"></codemirror>
          </div>

          <div class="gutter gutter-horizontal" style="width: 1px;"></div>

          <div class="pannel-piece pannel" style="width: calc(33.3333% - 1px);">
            <div class="windowLabelCont">
              <span class="windowLabel">ABI</span>
            </div>
            <codemirror v-model="abiCode" :options="cmOptions"></codemirror>
          </div>

          <div class="gutter gutter-horizontal" style="width: 1px;"></div>
          <div class="pannel-piece pannel" style="width: calc(33.3333% - 0.5px);">
            <div class="windowLabelCont">
              <span class="windowLabel">Client</span>
            </div>
            <codemirror v-model="clientCode" :options="cmOptions"></codemirror>
          </div>
        </div>

        <div class="gutter gutter-vertical" style="height: 1px;"></div>
        <div class="pannel-main" style="height: calc(30% - 0.5px);">
          <div class="windowLabelCont">
            <span class="windowLabel">Results</span>
          </div>
          <!-- <codemirror v-model="clientResult" :options="cmOptions"></codemirror> -->
          <div class="vue-codemirror">
            <div class="CodeMirror cm-s-darcula">
              <div class="results-container">
                <p v-for="log in clientResults">
                  <template v-if="typeof log == 'string'">
                    {{ log }}
                    <template v-if="log.indexOf('ccount using more than allotted RAM usage') > -1">
                      <br>
                      <input type="number" v-model="rambytes" style="width:100px"> bytes
                      <a class="btn btn-primary" @click="buyrambytes()">Buy RAM</a>
                    </template>

                    <template v-if="log.indexOf('need pay') > -1">
                      <a class="btn btn-primary" @click="payForView()">Pay</a>
                    </template>
                  </template>

                  <vue-json-pretty :data="log" v-if="typeof log != 'string'"></vue-json-pretty>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-tabs" v-if="isMobile">
        <ul>
          <li
            class="editor-tab"
            :class="{ active: tab.key == currentTab} "
            @click="currentTab = tab.key"
            v-for="(tab, index) in tabs"
            :key="index"
          >
            <a>{{ tab.name }}</a>
          </li>
        </ul>
        <div id="edit-ref">
          <a href="#">Edit in Zeus IDE</a>
        </div>
      </div>

      <div class="file-tabs" v-if="multiMode">
        <ul :current="currentEditFileName">
          <li
            v-if="file"
            class="editor-file"
            :class="{ active: currentEditFileName == file.fileName } 
                "
            v-for="(file, index) in editorFiles"
          >
            <a @click="selectFile(file)">{{ file.fileName }}</a>
            <a class="close-btn" @click="closeFile(file, index)">
              <v-icon name="times" scale="0.6"/>
            </a>
          </li>
        </ul>
      </div>
      <div
        id="editor"
        v-if="isMobile || multiMode"
        :class="{ 'frame-mode' : frameMode, 'mobile-mode' : isMobile,  }"
      >
        <div class="pannel-main" v-if="multiMode">
          <codemirror
            v-model="currentEditFile.content"
            :options="getFileCodeOptions(currentEditFile)"
          ></codemirror>
        </div>

        <div class="pannel-main" v-if="!multiMode">
          <div class="pannel-piece pannel" v-if="currentTab == 'contract'">
            <div class="windowLabelCont">
              <span class="windowLabel" v-if="projectType == 'eos'">cpp</span>
            </div>
            <codemirror v-model="contractCode" :options="contractOptions"></codemirror>
          </div>

          <div class="gutter gutter-horizontal" style="width: 1px;" v-if="!frameMode"></div>

          <div class="pannel-piece pannel" v-if="currentTab == 'abi'">
            <div class="windowLabelCont">
              <span class="windowLabel">ABI</span>
            </div>
            <codemirror v-model="abiCode" :options="cmOptions"></codemirror>
          </div>

          <div class="gutter gutter-horizontal" style="width: 1px;" v-if="!frameMode"></div>
          <div class="pannel-piece pannel" v-if="currentTab == 'client'">
            <div class="windowLabelCont">
              <span class="windowLabel">Client</span>
            </div>
            <codemirror v-model="clientCode" :options="cmOptions"></codemirror>
          </div>
        </div>

        <div class="gutter gutter-vertical" v-if="!frameMode" style="height: 1px;"></div>
        <div class="pannel-main" style="height: calc(30% - 0.5px);" v-if="!frameMode">
          <div class="windowLabelCont">
            <span class="windowLabel">Results</span>
          </div>
          <!-- <codemirror v-model="clientResult" :options="cmOptions"></codemirror> -->
          <div class="vue-codemirror">
            <div class="CodeMirror cm-s-darcula">
              <div class="results-container">
                <p v-for="log in clientResults">
                  <template v-if="typeof log == 'string'">
                    {{ log }}
                    <template v-if="log.indexOf('ccount using more than allotted RAM usage') > -1">
                      <br>
                      <input type="number" v-model="rambytes" style="width:100px"> bytes
                      <a class="btn btn-primary" @click="buyrambytes()">Buy RAM</a>
                    </template>

                    <template v-if="log.indexOf('need pay') > -1">
                      <a class="btn btn-primary" @click="payForView()">Pay</a>
                    </template>
                  </template>
                  <vue-json-pretty :data="log" v-if="typeof log != 'string'"></vue-json-pretty>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="bottom-bar" v-if="!frameMode">
      

      
    </div>
    <v-tour name="myTour" :steps="steps" :callbacks="tourCallbacks"></v-tour>
  </div>
</template>

<script>
// language
import "codemirror/mode/javascript/javascript.js";
// theme css
import "codemirror/theme/darcula.css";
// theme css
import "codemirror/theme/eclipse.css";
// require active-line.js
import "codemirror/addon/selection/active-line.js";
// styleSelectedText
import "codemirror/addon/selection/mark-selection.js";
import "codemirror/addon/search/searchcursor.js";
// hint
import "codemirror/addon/hint/show-hint.js";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/javascript-hint.js";
import "codemirror/addon/selection/active-line.js";
// highlightSelectionMatches
import "codemirror/addon/scroll/annotatescrollbar.js";
import "codemirror/addon/search/matchesonscrollbar.js";
import "codemirror/addon/search/searchcursor.js";
import "codemirror/addon/search/match-highlighter.js";
// keyMap
import "codemirror/mode/clike/clike.js";
import "codemirror/addon/edit/matchbrackets.js";
import "codemirror/addon/comment/comment.js";
import "codemirror/addon/dialog/dialog.js";
import "codemirror/addon/dialog/dialog.css";
import "codemirror/addon/search/searchcursor.js";
import "codemirror/addon/search/search.js";
import "codemirror/keymap/sublime.js";
// foldGutter
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/fold/comment-fold.js";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/indent-fold.js";
import "codemirror/addon/fold/markdown-fold.js";
import "codemirror/addon/fold/xml-fold.js";

import ecc from "eosjs-ecc";
import Dropdown from "./../components/Dropdown.vue";
var Eos = require("eosjs");

// import ScatterJS from 'scatterjs-core';
// import ScatterEOS from 'scatterjs-plugin-eosjs';

import NetworkHelper from "./network/network.js";
import files from "./files.js";
import local from "./local.js";
import exampleCodes from "./example.js";
import abiParser from "./abiParser/abiParser.js";
import tourData from "./tour.js";
import networkManager from "./networkManager.js";

// ScatterJS.plugins( new ScatterEOS() );

console.log("NetworkHelper", NetworkHelper);

var networkHelper = null;

var projectType = "eos";
var currentNetwork = "eosmain";

if (window.localStorage.getItem("projectType")) {
  projectType = window.localStorage.getItem("projectType");
}


networkHelper = new NetworkHelper(projectType);

var network = {
  blockchain: "eos",
  host: "eos.greymass.com", // ( or null if endorsed chainId )
  port: 443, // ( or null if defaulting to 80 )
  chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906" // Or null to fetch automatically ( takes longer )
};

network = {
  blockchain: "eos",
  host: "api.jungle.alohaeos.com", // ( or null if endorsed chainId )
  port: 443, // ( or null if defaulting to 80 )
  chainId: "038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca" // Or null to fetch automatically ( takes longer )
};


var JSZip = require("jszip");
var axios = require("axios");

var testnet = axios.create({
  baseURL: "http://TBD",
  timeout: 1000,
  headers: {}
});

var complier = axios.create({
  baseURL: "https://TBD",
  timeout: 300 * 1000,
  headers: {}
});

var ga = window.ga;

export default {
  props: ["id"],
  data() {
    return {
      ...tourData,
      stateDatabase: "",
      customnNetworkConfig: `{
          "name": "CryptoKylin TestNet",
          "key": "cryptokylin",
          "chainId": "5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191",
          "explorer": "https://tools.cryptokylin.io/",
          "endpoints": [{
              "ssl_endpoint": "https://jungle.eosio.cr",
              "producer": "activeeoscom"
          }]
      }`,
      localConfig: {},
      networkShowMode: true,
      currentTheme: "darcula",
      networkList: networkHelper.getAvaibleNetwork(),
      currentNetwork: currentNetwork,
      currentNetworkInfo: networkHelper.getNetworkInfo(currentNetwork),
      allEndpoints: networkHelper.getAllEndpoints(currentNetwork),
      currentHttpEndpoint: "",
      // currentApiEnpoint: networkHelper.getAvaibleEndpoints('eosmain'),
      projectId: null,
      menuOpen: false,
      currentTab: "contract",
      emebedFrameURL: "",
      //   emebedFrameURL: this.$route.fullPath.indexOf('?') > -1 ? this.$route.fullPath+'&frame=1' : this.$route.fullPath+'?frame=1',
      tabs: [
        {
          key: "contract",
          name: "cpp"
        },
        {
          key: "abi",
          name: "ABI"
        },
        {
          key: "client",
          name: "Client"
        }
      ],
      projectType: projectType,
      registerAccount: "",
      pubKey: "",
      network: network,
      privateKey: "",
      popupShow: false,
      scatter: null,
      identity: null,
      eosClient: null,
      readCli: null,
      account: "",
      contractAccount: "",
      accountLoading: false,
      smallMode: false,
      deployed: false,
      complieServerList: [
        {
          host: "https://TBD"
        }
      ],
      currentComplieServer: {
        host: "https://TBD"
      },
      mobileMenu: false,
      loaded: false,
      embedConfig: {
        theme: ""
      },
      contractOptions: {
        tabSize: 2,
        styleActiveLine: false,
        lineNumbers: true,
        styleSelectedText: false,
        line: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true },
        mode: "text/javascript",
        // hint.js options
        hintOptions: {
          // 当匹配只有一项的时候是否自动补全
          completeSingle: false
        },
        //快捷键 可提供三种模式 sublime、emacs、vim
        keyMap: "sublime",
        matchBrackets: true,
        showCursorWhenSelecting: true,
        theme: "darcula"
        // extraKeys: { "Ctrl": "autocomplete" }
      },
      cmOptions: {
        tabSize: 2,
        styleActiveLine: false,
        lineNumbers: true,
        styleSelectedText: false,
        line: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true },
        mode: "text/javascript",
        // hint.js options
        hintOptions: {
          // 当匹配只有一项的时候是否自动补全
          completeSingle: false
        },
        //快捷键 可提供三种模式 sublime、emacs、vim
        keyMap: "sublime",
        matchBrackets: true,
        showCursorWhenSelecting: true,
        theme: "darcula"
        // readOnly: true
        // extraKeys: { "Ctrl": "autocomplete" }
      },
      clientResults: [],
      frameMode: false,
      multiMode: true,
      currentEditFileName: "",
      currentEditFile: {},
      editorFiles: [],
      files: [],
      workTitle: "",
      workDesc: "",
      projectStatus: "public",
      projectPrice: "",
      clientResult: ``,
      contractCode: ``,
      abiCode: ``,
      clientCode: ``
    };
  },

  components: {
    Dropdown
  },

  created() {
    console.log("getAvaibleEndpoints", this.currentNetwork);
    this.currentEndpoint = networkHelper.getAvaibleEndpoints(
      this.currentNetwork
    );
    this.currentHttpEndpoint = this.currentEndpoint.ssl_endpoint;

    // this.readCli = Eos({
    //   chainId: network.chainId,
    //   httpEndpoint: "https://" + network.host
    // });

    var params = this.$route.params;
    if (params.project) {
      this.projectId = params.project;
      this.frameMode = !!this.$route.query.frame;
      if (this.frameMode) {
        this.isMobile = true;

        var selectTheme = this.$route.query.theme;
        this.currentTheme = selectTheme;
        this.contractOptions.theme = selectTheme;
        this.cmOptions.theme = selectTheme;

        console.log("selectTheme", selectTheme);

        if (drift) {
          drift.on("ready", function(api) {
            api.widget.hide();
          });
        }
      }
    }

    var enpintFrom = window.localStorage.getItem(
      this.projectType + "_endpoint"
    );
    if (enpintFrom) {
      this.currentHttpEndpoint = enpintFrom;
    }

    this.loadProject();
  },

  mounted: function() {
    console.log("projectId", this.projectId);
    this.initTour();
    // this.emebedFrameURL =
    //         window.location.origin +'/#'+ (this.$route.fullPath.indexOf('?') > -1
    //             ? this.$route.fullPath+'&frame=1' :
    //                 this.$route.fullPath+'?frame=1');

    console.log("projectId", this.$route, this.emebedFrameURL);

    this.initLocalConfig();

    this.initFileManager();

    this.$options.components.VueJsonPretty = () => import("vue-json-pretty");
    if (document) {
      var self = this;

      if (
        "-ms-scroll-limit" in document.documentElement.style &&
        "-ms-ime-align" in document.documentElement.style
      ) {
        // detect it's IE11
        window.addEventListener(
          "hashchange",
          function(event) {
            var currentPath = window.location.hash.slice(1);
            if (self.$route.path !== currentPath) {
              self.$router.push(currentPath);
            }
          },
          false
        );
      }

      if (this.projectType == "eos") {
        self.scatter = window.scatter;
        if (self.scatter) self.identity = self.scatter.identity;
        document.addEventListener("scatterLoaded", function() {
          console.log("scatterLoaded", window.scatter);
          self.scatter = window.scatter;
          self.identity = window.scatter.identity;
        });

        window.scatter.connect("ZeusIDE").then(connected => {
          console.log("ScatterJS", connected);
          // User does not have Scatter Desktop, Mobile or Classic installed.
          if (!connected) return false;
          console.log("ScatterJS");
          self.scatter = window.scatter;
          self.identity = self.scatter.identity;
        });
      } else {
      }

      setTimeout(() => {
        return;
        this.eosClient = Eos({
          chainId:
            "68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a",
          keyProvider: "5Kkpp6FA2g6rtUJTvakpTzZ7FHR3fnP32hrXv7yv4jPLbB9S251",
          httpEndpoint: "http://103.80.170.236:8870",
          logger: {
            log: null,
            error: null
          }
        });
        this.account = "testoooooooo";
      }, 5 * 1000);
      // this.$refs.container.style = "min-height:"+(window.innerHeight - 47)+"px";
    }
  },

  watch: {
    localConfig() {
      console.log("localConfig", this.localConfig);
      this.eosClient = Eos({
        chainId: this.currentNetworkInfo.chainId,
        keyProvider: [this.localConfig.privateKey],
        httpEndpoint: this.currentHttpEndpoint,
        logger: {
          log: null,
          error: null
        }
      });
      this.account = this.localConfig.account;
      this.contractAccount = this.localConfig.account;
    },

    currentEditFileName() {
      console.log("currentEditFileName change", this.currentEditFileName, this);
    },

    embedConfig: {
      deep: true,
      handler() {
        var mainURL =
          window.location.origin +
          "/#" +
          (this.$route.fullPath.indexOf("?") > -1
            ? this.$route.fullPath + "&frame=1"
            : this.$route.fullPath + "?frame=1");

        mainURL += "&theme=" + this.embedConfig.theme;

        console.log("mainURL", mainURL);
        this.emebedFrameURL = mainURL;
      }
    },

    files: {
      deep: true,
      handler() {
        this.autoSaveCode();
      }
    },
    currentHttpEndpoint() {
      var endpoints = this.allEndpoints.filter(end => {
        console.log(end.ssl_endpoint == this.currentHttpEndpoint);
        return end.ssl_endpoint == this.currentHttpEndpoint;
      });

      // rember
      window.localStorage.setItem(
        this.projectType + "_endpoint",
        this.currentHttpEndpoint
      );

      this.currentEndpoint = endpoints[0];

      this.initliazeScatter();
    },

    currentNetwork() {
      console.log("currentNetwork", "change", this.currentNetwork);

      this.currentEndpoint = networkHelper.getAvaibleEndpoints(
        this.currentNetwork
      );

      this.currentHttpEndpoint = this.currentEndpoint.ssl_endpoint;

      this.allEndpoints = networkHelper.getAllEndpoints(this.currentNetwork);

      this.currentNetworkInfo = networkHelper.getNetworkInfo(
        this.currentNetwork
      );
      // this.currentNetworkInfo = networkList();
      console.log(this.currentEndpoint);
      this.autoSaveCode();
      if (
        this.identity &&
        this.rawWork &&
        this.currentNetwork != this.rawWork.currentNetwork
      ) {
        this.signOut();
      }
    },
    $route() {
      var params = this.$route.params;
      if (params.project) {
        this.projectId = params.project;
      } else {
        this.projectId = "";
      }
      this.loadProject();

      var params = this.$route.params;
      if (params.project) {
        this.projectId = params.project;
        this.frameMode = !!this.$route.query.frame;
        if (this.frameMode) {
          this.isMobile = true;

          var selectTheme = this.$route.query.theme;
          this.currentTheme = selectTheme;
          this.contractOptions.theme = selectTheme;
          this.cmOptions.theme = selectTheme;

          console.log("selectTheme", selectTheme);

          if (drift) {
            drift.on("ready", function(api) {
              api.widget.hide();
            });
          }
        }
      }
    },

    projectPrice() {
      this.autoSaveCode();
    },
    projectStatus() {
      this.autoSaveCode();
    },

    workDesc() {
      this.autoSaveCode();
    },

    workTitle() {
      this.autoSaveCode();
    },

    contractCode(from) {
      this.autoSaveCode();
    },
    abiResults() {
      this.autoSaveCode();
    },
    clientCode() {
      this.autoSaveCode();
    },
    identity: function() {
      this.initliazeScatter();
    }
  },

  methods: {
    ...local,
    ...files,
    ...networkManager,
    embedCode() {
      this.embedConfig.theme = "eclipse";
    },
    initliazeScatter() {
      var self = this;

      console.log("initliazeScatter");

      try {
        if (self.identity) {
          self.identity.accounts.forEach(function(x) {
            if (x.blockchain == "eos") {
              self.identity.name = x.name + "@" + x.authority;
              self.identity.account = x.name;
            }
          });

          if (this.projectType == "eos") {
            var scatterNetwork = {
              blockchain: "eos",
              host: this.currentEndpoint.host, // ( or null if endorsed chainId )
              port: 443, // ( or null if defaulting to 80 )
              chainId: this.currentNetworkInfo.chainId // Or null to fetch automatically ( takes longer )
            };

            console.log("scatterNetwork", scatterNetwork);

            self.eosClient = this.scatter.eos(
              scatterNetwork,
              Eos,
              {
                broadcast: true,
                sign: true,
                chainId: this.currentNetworkInfo.chainId
              },
              "https"
            );
          } else {
            console.log("self.identity", self.identity);
          }
        }

        this.account = self.identity.account;

        if (!this.projectId) this.contractAccount = this.account;
      } catch (e) {
        console.log(e);
      }
    },

    selectNetwork(network) {
      this.currentNetworkInfo = network;
      this.currentNetwork = network.key;
    },

    payForView() {
      console.log(this.owner);
      (async () => {
        try {
          var payResults = await this.eosClient.transfer(
            this.account,
            this.owner,
            this.projectPrice + ".0000 EOS",
            "pay:" + this.projectId
          );
          if (payResults.transaction_id) {
            this.setProject(this.work, this.rawData);
            this.clientResults = [];
          }
        } catch (e) {}
      })();
    },
    setProject(work) {
      this.rawWork = work;
      this.workDesc = work.workDesc || "";
      this.workTitle = work.workTitle || "";
      (this.contractCode = work.contractCode), (this.abiCode = work.abiCode);
      this.clientCode = work.clientCode;
      this.projectPrice = work.projectPrice;
      this.projectStatus = work.projectStatus || "public";
      this.currentNetwork = work.currentNetwork || currentNetwork;
      if (this.projectType == "eos") {
        this.contractOptions.mode = "text/x-c++src";
        if (this.multiMode) {
          if (!work.files || (work.files && !work.files.length)) {
            this.files = exampleCodes.eos.files;
          } else {
            this.files = work.files;
          }
        }
      } else {
        if (this.multiMode) {
          if (!work.files || (work.files && !work.files.length)) {
            this.files.push({
              fileName: "contract.js",
              isLeader: true,
              content: this.contractCode
            });

            this.files.push({
              fileName: "ABI.json",
              content: this.abiCode
            });

            this.files.push({
              fileName: "client.js",
              content: this.clientCode
            });
          } else {
            this.files = work.files;
          }
        }
      }
    },

    loadProject() {
      this.contractCode = ``;
      this.abiCode = ``;
      this.clientCode = ``;

      if (!this.projectId) {
        return this.loadProjectFromLocal();
      }

      console.log("loadProject from chain");

      (async () => {
        try {
          var all = this.projectId.split(":");
          var currentNetwork = all[2] || "jungle";
          this.currentNetwork = currentNetwork;
          var networkEndpint = networkHelper.getAvaibleEndpoints(
            currentNetwork
          );

          var eosMainClient = Eos({
            chainId: this.currentNetworkInfo.chainId,
            keyProvider: "5JeEt5AkdathF21TjM5GXhfPvZD27YNZPknzp8XCURi95xdzAfe",
            httpEndpoint: networkEndpint.ssl_endpoint,
            logger: {
              log: null,
              error: null
            }
          });

          var queryConfig = {
            id: all[0]
          };

          if (all[1] && all[1] != "undefined") {
            queryConfig.block_num_hint = parseInt(all[1]);
          }

          var transcation = null;
          var rawData = null;

          try {
            transcation = await eosMainClient.getTransaction(queryConfig);
            rawData = transcation.trx.trx.actions[0].data;
          } catch (e) {
            if (!queryConfig.block_num_hint) alert("getTransaction failed");

            if (queryConfig.block_num_hint) {
              for (let index = 0; index < 20; index++) {
                const blockNum = queryConfig.block_num_hint++;
                var block = await eosMainClient.getBlock(blockNum);
                var hitTrx = null;
                block.transactions.forEach(transaction => {
                  if (
                    typeof transaction.trx != "string" &&
                    transaction.trx.id == queryConfig.id
                  ) {
                    hitTrx = transaction;
                  }
                });

                if (hitTrx) {
                  console.log("hitTrx", hitTrx);
                  rawData = hitTrx.trx.transaction.actions[0].data;
                  break;
                }
                console.log(blockNum, block);
              }
            } else {
              console.log("failed");
            }
          }

          var content = rawData.content;
          var workrawData = Buffer.from(content, "hex").toString();
          var work = JSON.parse(workrawData);

          this.owner = rawData.owner;

          this.rawData = rawData;
          this.work = work;
          this.contractAccount = rawData.owner;

          this.setProject(work, rawData);

          this.editorAfterProjectLoad();

          if (work.projectStatus == "private") {
            this.clientResults.push(
              "you need pay " + work.projectPrice + " EOS to view these codes"
            );

            this.contractCode = `you have not view access`;
            this.abiCode = `you have not view access`;
            this.clientCode = `you have not view access`;

            if (work.clientResults) {
              work.clientResults.forEach(r => {
                this.clientResults.push(r);
              });
            }
          }
          console.log("loadProject", work);
        } catch (e) {
          console.log(e);
        }
      })();
    },

    loadProjectFromLocal() {
      console.log("loadProjectFromLocal");

      var work = window.localStorage.getItem("work");
      console.log("loadProjectFromLocal", this.$route, work);

      if (work) {
        work = JSON.parse(work);
        this.setProject(work);
        this.loaded = true;
        this.initEditor();
        this.editorAfterProjectLoad();
        return;
      }

      if (this.projectType == "eos") {
        this.contractOptions.mode = "text/x-c++src";
        this.contractCode = `#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
using namespace eosio;

class hello : public eosio::contract {
  public:
      using contract::contract;

      [[eosio::action]]
      void hi( account_name user ) {
        print( "Hello, ", name{user} );
      }
};

EOSIO_ABI( hello, (hi) )`;

        this.abiCode = `{
    "version": "eosio::abi/1.0",
    "structs": [
    {
        "name": "hi",
        "base": "",
        "fields": [{
            "name": "user",
            "type": "name"
        }]
    }],
    "actions": [
        {
            "name": "hi",
            "type": "hi",
            "ricardian_contract": ""
        }
    ]
};`;

        this.clientCode = `(async () => {
  try{
    var res = await contract.hi('welcome', {
      authorization: account
    });
    console.log(res.processed.action_traces[0].console)
    console.log(res);
  }catch(e){
    console.log(e);
  }
})(); `;

        if (this.multiMode) {
          this.files = exampleCodes.eos.files;
        }
      } else {
        this.contractCode = `exports.hi = (user, content) => {
    console.log(action);

    if(!action.has_auth(user)){
      console.log('无权限')
    }

    if(!action.is_account(user)){
        console.log('请提供一个存在的帐号')
    }else{
        console.log('帐号存在')
    }
}`;

        this.abiCode = `{
  "version": "eosio::abi/1.0",
  "structs": [
  // 结构体 hi定义 
  {
      "name": "hi",
      "base": "",
      "fields": [{
          "name": "user",
          "type": "name"
      }, {
          "name": "content",
          "type": "string"
      }]
  }],
  "actions": [
      // 定义了一个叫hi的action, 类型结构体为 hi
      {
          "name": "hi",
          "type": "hi",
          "ricardian_contract": ""
      }
  ]
};`;

        this.clientCode = `(async () => {
  var res = await contract.hi('funis', '这是一个测试', {
      authorization: account
  });
  console.log(res.processed.action_traces[0].console)
  console.log(res);
})(); `;

        if (this.multiMode) {
          this.files.push({
            fileName: "contract.js",
            isLeader: true,
            content: this.contractCode
          });

          this.files.push({
            fileName: "abi.json",
            content: this.abiCode
          });

          this.files.push({
            fileName: "test.js",
            content: this.clientCode
          });
        }
      }

      this.editorAfterProjectLoad();
      this.loaded = true;
    },

    autoSaveCode() {
      if (!this.loaded || this.projectId) {
        console.log("autoSaveCode loaded=false");
        return;
      }

      var localstorage = window.localStorage;
      var currentWork = JSON.stringify({
        workTitle: this.workTitle,
        workDesc: this.workDesc,
        contractCode: this.contractCode,
        abiCode: this.abiCode,
        clientCode: this.clientCode,
        projectPrice: this.projectPrice,
        projectStatus: this.projectStatus,
        currentNetwork: this.currentNetwork,
        xxFiles: this.files,
        files: this.files.map(data => {
          return {
            fileName: data.fileName,
            content: data.content,
            isLeader: data.isLeader,
            hexData: data.hexData,
            compiled: data.compiled
          };
        }),
        lastSave: Date.now()
      });

      localstorage.setItem("work", currentWork);

      console.log("autoSaveCode", currentWork, this.loaded);
    },


    buyrambytes() {
      (async () => {
        try {
          var res = await this.eosClient.buyrambytes(
            this.account,
            this.account,
            parseInt(this.rambytes)
          );
          this.clientResults.push("buyram sucess");
        } catch (e) {
          this.clientResults.push("buyram failed");
          this.clientResults.push(e);
        }
      })();
    },

    donate() {},


    toggleMenu() {
      this.smallMode = !this.smallMode;
    },

    toogleMobile() {
      this.mobileMenu = !this.mobileMenu;
    },
    connectScatter: function() {
      var self = this;

      if (this.projectType == "xxx") {
      } else {
        console.log("connectScatter");
        this.scatter
          .getIdentity({
            accounts: [
              {
                chainId: this.currentNetworkInfo.chainId,
                blockchain: "eos"
              }
            ]
          })
          .then(function() {
            console.log("Attach Identity");
            console.log(self.scatter.identity);
            self.identity = self.scatter.identity;
          })
          .catch(error => {
            // console.error(error);
            this.clientResults.push(error);
          });
      }
    },

    signOut: function() {
      var self = this;
      console.log("connectScatter");
      this.scatter
        .forgetIdentity()
        .then(function() {
          console.log("Detach Identity");
          self.identity = self.scatter.identity;
        })
        .catch(function(error) {
          console.error(error);
        });
    },

    createAccount: function() {
      // http://103.80.170.236/createAccount
      // name
      // pubkey
      if (!this.registerAccount || !this.pubKey) {
        console.log(this.registerAccount, this.pubKey);
        return;
      }

      // console.log(createAccount);
      (async () => {
        try {
          var response = await testnet.post("/createAccount", {
            name: this.registerAccount,
            pubkey: this.pubKey
          });
          console.log(response);
        } catch (e) {
          console.log(e);
        }
      })();
    },

    generateKeyPair: function() {
      (async () => {
        var privateKey = await ecc.randomKey();
        var pubKey = ecc.privateToPublic(
          privateKey,
          this.projectType == "eos" ? "EOS" : "FO"
        );
        console.log("generateKeyPair", privateKey, pubKey);
        this.privateKey = privateKey;
        this.pubKey = pubKey;
      })();
    },

    deployCode() {
      this.clientResults = [];

      console.log("deployCode", ga);
      if (!this.eosClient) {
        this.clientResults.push("account required, please attach an account");
        gtag("event", "DeployCode", {
          event_action: "no_account"
        });
        console.log("eosClient", this.eosClient);
        return;
      }

      var json = eval("(function(){ return " + this.abiCode + "} )();");
      console.log(json);

      gtag("event", "DeployCode", {
        event_action: "deploy_start"
      });

      (async () => {
        try {
          var zip = new JSZip();
          var contractCode = this.contractCode;
          var abiFile = this.files.filter(function(item) {
            return item.fileName.indexOf(".abi") > -1;
          });

          if (this.multiMode) {
            this.files.forEach(file => {
              if (file.isLeader) {
                zip.file("index.js", file.content);
              } else {
                zip.file(file.fileName, file.content);
              }
            });
          } else {
            zip.file("index.js", this.contractCode);
          }

          this.clientResults.push("Compile...");
          var contractBuffer = await zip.generateAsync({ type: "nodebuffer" });

          if (this.projectType == "eos") {
            var reuestPayload = {};

            if (this.multiMode) {
              reuestPayload.files = this.files;
              var abiFile = this.files.filter(function(item) {
                return item.fileName.indexOf(".abi") > -1;
              });

              if (abiFile.length) {
                json = JSON.parse(abiFile[0].content);
              } else {
                alert("abi not exists");
                return;
              }

              console.log("abiFile", json);
            } else {
              reuestPayload.content = this.contractCode;
            }

            var compiledFiles = this.files.filter(function(item) {
              return item.compiled;
            });

            if (compiledFiles.length) {
              contractBuffer = new Buffer(compiledFiles[0].hexData, "hex");
              this.clientResults.push("find compiled file");
            } else {
              console.log("compiledFiles", compiledFiles, this.files);
              var response = await complier.post("/complie", {
                files: this.files
              });
              if (response.data.wasm) {
                contractBuffer = new Buffer(response.data.wasm, "hex");
              } else {
                this.clientResults.push(response.data.logs);
                return;
              }
            }

            // console.log(response);
          } else {
            console.log("abiParser", abiParser);

            var javaAbiFile = this.files.filter(function(item) {
              return item.fileName.indexOf(".java") > -1;
            });

            if (javaAbiFile.length) {
              var testParser = new abiParser();
              json = testParser.parse(javaAbiFile[0].content);
              console.log("javaAbiFile", javaAbiFile, json);
            } else {
              var abiFile = this.files.filter(function(item) {
                return item.fileName.indexOf(".json") > -1;
              });
              console.log("abiFile", abiFile);
              if (abiFile.length) {
                json = JSON.parse(abiFile[0].content);
              }
            }
          }

          this.clientResults.push("Complie sucess...");
          this.clientResults.push("Deploy...");

          this.deployed = true;

          var abiResults = await this.eosClient.setabi(this.account, json, {
            authorization: this.account
          });
          var result = await this.eosClient.setcode(
            this.account,
            0,
            0,
            contractBuffer,
            {
              authorization: this.account
            }
          );

          this.clientResults.push("Deploy sucess...");

          gtag("event", "DeployCode", {
            event_action: "deploy_success"
          });

          this.clientResults.push(abiResults);
          this.clientResults.push(result);
          console.log(abiResults, result);
        } catch (e) {
          this.clientResults.push("Deploy failed... " + this.account);
          console.log("deploy_failed", e, e.name, e.message);
          try {
            var errorJson = JSON.parse(e);
            if (e.indexOf("verify_account_ram_usage") > -1) {
            }
            if (errorJson.error) {
              this.clientResults.push(
                errorJson.error.what + ". " + errorJson.error.details[0].message
              );
              gtag("event", "DeployCode", {
                event_action: "deploy_failed",
                event_label: errorJson.error.code
              });
            } else {
              this.clientResults.push(errorJson);
            }
          } catch (er) {
            gtag("event", "DeployCode", {
              event_action: "deploy_failed",
              event_label: e.name
            });
            this.clientResults.push(e);
          }
          console.log(e);
        }
      })();
    },

    saveProject() {
      this.clientResults = [];
      if (!this.eosClient) {
        this.clientResults.push("account required, please attach an account");

        gtag("event", "SaveProject", {
          action: "no_account"
        });
        return;
      }

      (async () => {
        try {
          this.clientResults.push("save project");
          var devforeoskit = await this.eosClient.contract("devforeoskit");
          var jsonStr = JSON.stringify({
            workTitle: this.workTitle,
            workDesc: this.workDesc,
            contractCode: this.contractCode,
            abiCode: this.abiCode,
            clientCode: this.clientCode,
            projectPrice: this.projectPrice,
            projectStatus: this.projectStatus,
            clientResults: this.clientResults,
            currentNetwork: this.currentNetwork,
            files: this.files,
            lastSave: Date.now()
          });

          var hexString = Buffer.from(jsonStr, "utf-8").toString("hex");

          console.log("project", hexString);

          var networkInfo = await this.eosClient.getInfo({});
          var res = await devforeoskit.create(this.account, hexString, {
            authorization: this.account
          });

          console.log(res);

          var startBlockNum = res.processed.block_num
            ? res.processed.block_num
            : networkInfo.head_block_num;

          var projectId =
            res.processed.id + ":" + startBlockNum + ":" + this.currentNetwork;
          // 6ee777d9250df87fc47d087f68baa77275261c266ed63db91064ce5f9922d0c8
          console.log(projectId);
          // this.clientResults.push(window.location.protocol+'://'+projectId);
          this.clientResults.push("save project sucess");
          this.clientResults.push("project ID:" + projectId);

          gtag("event", "SaveProject", {
            event_action: "save_success"
          });

          console.log("this.$route", this.$route);
          this.$router.push({
            name: "Project",
            params: {
              project: projectId
            }
          });
        } catch (e) {
          // markError

          gtag("event", "SaveProject", {
            event_action: "save_failed"
          });

          gtag("event", "exception", {
            description: "SaveProject" + e.message,
            fatal: true // set to true if the exception is fatal
          });

          this.clientResults.push(e);
        }
      })();
    },

    runCode() {
      this.clientResults = [];

      if (!this.deployed) {
        this.clientResults.push("contract not deployed");
        return;
      }

      if (!this.eosClient) {
        this.clientResults.push("account required, please attach an account");
        gtag("event", "RunCode", {
          event_action: "no_account"
        });
        return;
      }

      this.clientResults.push("init contract... " + this.contractAccount);

      gtag("event", "RunCode", {
        event_action: "run_start"
      });

      window.addEventListener("error", error => {
        console.log(error); // 不会触发
      });

      window.onunhandledrejection = function(event) {
        console.log(event.promise, event.reason);
      };

      window.onrejectionhandled = function(event) {
        console.log(event.promise);
      };
      ~(async () => {
        try {
          var myContract = await this.eosClient.contract(this.contractAccount);
          this.clientResults.push("init contract sucess");
          var clientCode = this.clientCode;
          if (this.multiMode) {
            var jsFile = this.files.filter(function(item) {
              return (
                !item.isLeader &&
                item.fileName.indexOf(".js") > -1 &&
                item.fileName.indexOf(".json") < 0
              );
            });
            console.log("jsFile", jsFile);
            if (jsFile.length) {
              clientCode = jsFile[0].content;
            }
          }

          var clientFunc = eval(
            "(function(){ return function runtime(contract, console, account, Eos){ ;;try{ " +
              clientCode +
              "}catch(e){ console.log(e) };; } })();"
          );

          var resultStr = [];

          console.log(myContract, clientFunc.toString());
          // this.clientResults = [];

          var self = this;
          function collectLogs(args) {
            var res = [];
            args.forEach(arg => {
              // res.push(JSON.stringify(arg));
              res.push(arg);
            });

            if (res.length) {
              self.clientResults.push(res[0]);
            } else {
              self.clientResults.push(res);
            }
          }

          this.clientResults.push("excute...");

          var self = this;

          try {
            clientFunc(
              myContract,
              {
                log: function() {
                  console.log("clientFunc", arguments);
                  var args = Array.prototype.slice.call(arguments);
                  collectLogs(args);
                },
                error: function() {
                  console.log("clientFunc", arguments);
                  var args = Array.prototype.slice.call(arguments);
                  collectLogs(args);
                }
              },
              this.account,
              {
                getClient: function(privateKey, config) {
                  config = config || {};
                  var conf = Object.assign(
                    {
                      chainId: self.currentNetworkInfo.chainId,
                      keyProvider: [privateKey],
                      httpEndpoint: self.currentHttpEndpoint,
                      logger: {
                        log: null,
                        error: null
                      }
                    },
                    config
                  );

                  return Eos(conf);
                }
              }
            );

            gtag("event", "RunCode", {
              event_action: "run_success"
            });
          } catch (e) {
            this.clientResults.push("excute failed");
            this.clientResults.push(e);

            gtag("event", "RunCode", {
              event_action: "run_failed",
              event_label: e.name
            });
          }
          // console.log(resultStr);
        } catch (e) {
          console.error(e);
          this.clientResults.push("init failed");
          gtag("event", "RunCode", {
            event_action: "init_failed",
            event_label: e.name
          });
          this.clientResults.push(e);
        }
      })();
    }
  }
};
</script>


<style lang="less">
@import "./main.css";
@import "./theme-eclipse.css";
</style>
