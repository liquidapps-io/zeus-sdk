const { requireBox } = require("@liquidapps/box-utils");
const fetch = require("node-fetch");
const { Serialize } = require("eosjs");
const { TextDecoder, TextEncoder } = require("text-encoding");
const { hexToUint8Array, arrayToHex } = Serialize;
const { genRandomId } = requireBox("seed-eos/tools/eos/utils");
const { getLinkedAccount } = requireBox(
  "dapp-services/services/dapp-services-node/common"
);
const querystring = require("querystring");

const contractAccount = process.env.CONTRACT || "";
const endpoint = process.env.DSP_ENDPOINT || "";
let lastBlock = process.env.LAST_BLOCK || 35000000;

const hyperionEndpoint =
  process.env.HYPERION_ENDPOINT || "https://api-wax.maltablock.org";
const sidechainName = process.env.SIDECHAIN;
const url = `${endpoint}/event`;
if (!endpoint) throw new Error(`must set DSP_ENDPOINT`);
if (!contractAccount) throw new Error(`must set CONTRACT`);

var cnt = 0;
var totalSize = 0;
var start = new Date();
var passedTime;
var speed;
async function replay(hexData) {
  if (hexData.length == 0) {
    return;
  }
  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder(),
  });
  const origBuffer = hexToUint8Array(hexData);
  buffer.pushBytes(origBuffer);
  buffer.restartRead();
  var bytes = buffer.getUint8Array(buffer.length);
  const res = arrayToHex(bytes);
  const base64data = Buffer.from(res, "hex").toString("base64");
  const txId = genRandomId();

  const meta = { txId, blockNum: 1, eventNum: 1 };
  if (sidechainName) {
    meta.sidechain = {
      dsp_port: process.env.SIDECHAIN_DSP_PORT,
      nodeos_endpoint: `${process.env.NODEOS_MAINNET_ENDPOINT}`,
      name: sidechainName,
    };
  }
  const dappservicesContract = sidechainName
    ? await getLinkedAccount(null, null, `dappservices`, sidechainName)
    : `dappservices`;

  const actionName = sidechainName ? "usagex" : "usage";
  const body = {
    receiver: dappservicesContract,
    method: actionName,
    account: contractAccount,
    data: {
      usage_report: {
        quantity: "0.0001 QUOTA",
        provider: "",
        payer: contractAccount,
        service: "ipfsservice1",
        package: "default",
        success: 0,
      },
    },
    event: {
      version: "1.0",
      etype: "service_request",
      payer: contractAccount,
      service: "ipfsservice1",
      action: "commit",
      provider: "",
      data: base64data,
      meta: meta,
    },
    meta: {
      block_num: 170,
      block_time: "2019-03-21T10:35:03.500",
      elapsed: 275,
      trx_id: txId,
      receipt: {
        receiver: dappservicesContract,
        act_digest:
          "77f94e3cda1c581b9733654e649f2e970212749a3946c9bf1e2b1fbbc2a74247",
        global_sequence: 684,
        recv_sequence: 94,
        auth_sequence: [["ipfsservice1", 172]],
        code_sequence: 1,
        abi_sequence: 3,
      },
      context_free: false,
      producer_block_id: null,
      account_ram_deltas: [],
      except: null,
    },
    replay: true,
  };
  var r = await fetch(url, { method: "POST", body: JSON.stringify(body) });
  await r.text();
  totalSize += hexData.length / 2 + 320;

  if (++cnt % 5 == 0) {
    passedTime = (new Date().getTime() - start.getTime()) / 1000.0;
    speed = (totalSize / (1024 * passedTime)).toFixed(2);
  }
  process.stdout.write("\r");
  process.stdout.write(
    `sent ${cnt} saved ${(totalSize / 1024).toFixed(
      2
    )}KB ${speed}KB/s Block:${lastBlock}                    `
  );
}

function chunk(arr, len) {
  var chunks = [];
  var i = 0;
  var n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
}

async function run() {
  let skip = 0;
  const LIMIT = 100;

  while (true) {
    const qs = querystring.encode({
      code: contractAccount,
      scope: contractAccount,
      table: `ipfsentry`,
      skip,
      limit: LIMIT,
    });
    const url = `${hyperionEndpoint}/v2/history/get_deltas?${qs}`;
    console.log(`fetching `, url);
    const response = await fetch(url).then((resp) => resp.json());
    const commits = response.deltas;
    skip += commits.length;

    const chunks = chunk(commits, 5);
    for (const chunk of chunks) {
      await Promise.all(chunk.map(c => {
        return replay(c.data.data);
      })).catch(error => {
        console.error(`Error while replay: `, error.message)
      });
    }

    if (commits.length === 0) break;
  }
  console.log(`Done`)
}

run().catch((error) => {
  console.error(error.stack);
});