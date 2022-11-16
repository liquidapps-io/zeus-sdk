var zeos = require('../services/oracle-dapp-service-node/protocols/pkg/zeos_updater.js');

const fetch = require("node-fetch");
global.fetch = fetch;

// TODO: might require: npm i --save @liquidapps/dapp-client.
const { createClient } = require('@liquidapps/dapp-client');

// TODO: for zeus use port 13015, for live environment on DSPs use port 3115
process.env.DSP_PORT = 13015;
var endpoint = `http://localhost:${process.env.DSP_PORT || 3115}`;

// Convert a hex string to a byte array
function hex2Bytes(hex)
{
  for(var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

// merkle tree helper functions
function MT_ARR_LEAF_ROW_OFFSET(d) {return ((1n<<(d)) - 1n);}
function MT_ARR_FULL_TREE_OFFSET(d) {return ((1n<<((d)+1n)) - 1n);}
function MT_NUM_LEAVES(d) {return (1n<<(d));}

module.exports = async ({ proto, address }) => {
  // zeos_merkle_tree_updater://<leaf_count>/<tree_depth>/<note_commitments[]>

  // split address to extract parameters
  const payloadParts = address.split('/');

  var res;
  await zeos().then(async (instance) => {

    // read leaf_count, tree_depth and note_commitments from uri 'address'
    var leaf_count = BigInt(payloadParts[0]);
    var tree_depth = BigInt(payloadParts[1]);
    var note_commitments = hex2Bytes(payloadParts[2]);
    var note_commitments_ptr = instance.allocate(note_commitments, instance.ALLOC_NORMAL);

    // calculate indices of nodes to fetch
    var indices = [];
    var idx = MT_ARR_LEAF_ROW_OFFSET(tree_depth) + leaf_count % MT_NUM_LEAVES(tree_depth);
    var tos = leaf_count / MT_NUM_LEAVES(tree_depth) /*=tree_idx*/ * MT_ARR_FULL_TREE_OFFSET(tree_depth);
    for(var d = 0n; d < tree_depth; d++)
    {
      // if array index of node is uneven it is always the left child
      var is_left_child = 1n == idx % 2n;
      // determine sister node
      var sis_idx = is_left_child ? idx + 1n : idx - 1n;
      // if idx is a right child add its sister node index to list
      if(!is_left_child)
      {
        indices.push(tos + sis_idx);
      }
      // set idx to parent node index:
      // left child's array index divided by two (integer division) equals array index of parent node
      idx = is_left_child ? idx / 2n : sis_idx / 2n;
    }

    // TODO: fetch final nodes from VRAM
    //let dappClient = await createClient({ httpEndpoint: endpoint, fetch });
    //let vramClient = await dappClient.service("ipfs", "thezeostoken");
    //var response = await vramClient.get_vram_row("thezeostoken", "thezeostoken", "vk", "zeosorchard1");
    //var str = response.row.vk;

    // fetch final nodes from EOS RAM
    var final_nodes = "";
    for(const i of indices)
    {
      res = await fetch(endpoint + '/v1/chain/get_table_rows', {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ code: 'thezeostoken', table: 'mteosram', scope: 'thezeostoken', index_position: 'primary', key_type: 'uint64_t', lower_bound: i.toString(), upper_bound: i.toString() })
      });
      var resJson = await res.json();
      final_nodes += resJson.rows[0];
    };
    var final_nodes = hex2Bytes(final_nodes);
    var final_nodes_ptr = instance.allocate(final_nodes, instance.ALLOC_NORMAL);
    
    res = instance.update_merkle_tree(
      Number(leaf_count), 
      Number(leaf_count >> 32n), 
      Number(tree_depth), 
      final_nodes_ptr, 
      indices.length, 
      note_commitments_ptr, 
      note_commitments.length / 32
    );

    res = Buffer.from(res, 'binary');
  });

  return res;
};

