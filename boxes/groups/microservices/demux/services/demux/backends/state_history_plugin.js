#!/usr/bin/env node

const { TextDecoder, TextEncoder } = require('text-encoding');
const WebSocket = require('ws');
var pako = require('pako');

const ws = new WebSocket(`ws://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_WEBSOCKET_PORT || '8889'}`, {
  perMessageDeflate: false

});
var expectingABI = true;
ws.on('open', function open () {
  expectingABI = true;
  console.log('ws connected');
});
const { Serialize } = require('../eosjs2');

const abiabi = {
  'version': 'eosio::abi/1.1',
  'structs': [{
    'name': 'extensions_entry',
    'base': '',
    'fields': [{
      'name': 'tag',
      'type': 'uint16'
    },
    {
      'name': 'value',
      'type': 'bytes'
    }
    ]
  },
  {
    'name': 'type_def',
    'base': '',
    'fields': [{
      'name': 'new_type_name',
      'type': 'string'
    },
    {
      'name': 'type',
      'type': 'string'
    }
    ]
  },
  {
    'name': 'field_def',
    'base': '',
    'fields': [{
      'name': 'name',
      'type': 'string'
    },
    {
      'name': 'type',
      'type': 'string'
    }
    ]
  },
  {
    'name': 'struct_def',
    'base': '',
    'fields': [{
      'name': 'name',
      'type': 'string'
    },
    {
      'name': 'base',
      'type': 'string'
    },
    {
      'name': 'fields',
      'type': 'field_def[]'
    }
    ]
  },
  {
    'name': 'action_def',
    'base': '',
    'fields': [{
      'name': 'name',
      'type': 'name'
    },
    {
      'name': 'type',
      'type': 'string'
    },
    {
      'name': 'ricardian_contract',
      'type': 'string'
    }
    ]
  },
  {
    'name': 'table_def',
    'base': '',
    'fields': [{
      'name': 'name',
      'type': 'name'
    },
    {
      'name': 'index_type',
      'type': 'string'
    },
    {
      'name': 'key_names',
      'type': 'string[]'
    },
    {
      'name': 'key_types',
      'type': 'string[]'
    },
    {
      'name': 'type',
      'type': 'string'
    }
    ]
  },
  {
    'name': 'clause_pair',
    'base': '',
    'fields': [{
      'name': 'id',
      'type': 'string'
    },
    {
      'name': 'body',
      'type': 'string'
    }
    ]
  },
  {
    'name': 'error_message',
    'base': '',
    'fields': [{
      'name': 'error_code',
      'type': 'uint64'
    },
    {
      'name': 'error_msg',
      'type': 'string'
    }
    ]
  },
  {
    'name': 'variant_def',
    'base': '',
    'fields': [{
      'name': 'name',
      'type': 'string'
    },
    {
      'name': 'types',
      'type': 'string[]'
    }
    ]
  },
  {
    'name': 'abi_def',
    'base': '',
    'fields': [{
      'name': 'version',
      'type': 'string'
    },
    {
      'name': 'types',
      'type': 'type_def[]'
    },
    {
      'name': 'structs',
      'type': 'struct_def[]'
    },
    {
      'name': 'actions',
      'type': 'action_def[]'
    },
    {
      'name': 'tables',
      'type': 'table_def[]'
    },
    {
      'name': 'ricardian_clauses',
      'type': 'clause_pair[]'
    },
    {
      'name': 'error_messages',
      'type': 'error_message[]'
    },
    {
      'name': 'abi_extensions',
      'type': 'extensions_entry[]'
    },
    {
      'name': 'variants',
      'type': 'variant_def[]$'
    }
    ]
  }
  ]
};
const abis = {
  'eosio': {
    'version': 'eosio::abi/1.0',
    'types': [{
      'new_type_name': 'account_name',
      'type': 'name'
    }, {
      'new_type_name': 'permission_name',
      'type': 'name'
    }, {
      'new_type_name': 'action_name',
      'type': 'name'
    }, {
      'new_type_name': 'transaction_id_type',
      'type': 'checksum256'
    }, {
      'new_type_name': 'weight_type',
      'type': 'uint16'
    }],
    '____comment': 'eosio.bios structs: set_account_limits, setpriv, set_global_limits, producer_key, set_producers, require_auth are provided so abi available for deserialization in future.',
    'structs': [{
      'name': 'permission_level',
      'base': '',
      'fields': [
        { 'name': 'actor', 'type': 'account_name' },
        { 'name': 'permission', 'type': 'permission_name' }
      ]
    }, {
      'name': 'key_weight',
      'base': '',
      'fields': [
        { 'name': 'key', 'type': 'public_key' },
        { 'name': 'weight', 'type': 'weight_type' }
      ]
    }, {
      'name': 'bidname',
      'base': '',
      'fields': [
        { 'name': 'bidder', 'type': 'account_name' },
        { 'name': 'newname', 'type': 'account_name' },
        { 'name': 'bid', 'type': 'asset' }
      ]
    }, {
      'name': 'permission_level_weight',
      'base': '',
      'fields': [
        { 'name': 'permission', 'type': 'permission_level' },
        { 'name': 'weight', 'type': 'weight_type' }
      ]
    }, {
      'name': 'wait_weight',
      'base': '',
      'fields': [
        { 'name': 'wait_sec', 'type': 'uint32' },
        { 'name': 'weight', 'type': 'weight_type' }
      ]
    }, {
      'name': 'authority',
      'base': '',
      'fields': [
        { 'name': 'threshold', 'type': 'uint32' },
        { 'name': 'keys', 'type': 'key_weight[]' },
        { 'name': 'accounts', 'type': 'permission_level_weight[]' },
        { 'name': 'waits', 'type': 'wait_weight[]' }
      ]
    }, {
      'name': 'newaccount',
      'base': '',
      'fields': [
        { 'name': 'creator', 'type': 'account_name' },
        { 'name': 'name', 'type': 'account_name' },
        { 'name': 'owner', 'type': 'authority' },
        { 'name': 'active', 'type': 'authority' }
      ]
    }, {
      'name': 'setcode',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'vmtype', 'type': 'uint8' },
        { 'name': 'vmversion', 'type': 'uint8' },
        { 'name': 'code', 'type': 'bytes' }
      ]
    }, {
      'name': 'setabi',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'abi', 'type': 'bytes' }
      ]
    }, {
      'name': 'updateauth',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'permission', 'type': 'permission_name' },
        { 'name': 'parent', 'type': 'permission_name' },
        { 'name': 'auth', 'type': 'authority' }
      ]
    }, {
      'name': 'deleteauth',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'permission', 'type': 'permission_name' }
      ]
    }, {
      'name': 'linkauth',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'code', 'type': 'account_name' },
        { 'name': 'type', 'type': 'action_name' },
        { 'name': 'requirement', 'type': 'permission_name' }
      ]
    }, {
      'name': 'unlinkauth',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'code', 'type': 'account_name' },
        { 'name': 'type', 'type': 'action_name' }
      ]
    }, {
      'name': 'canceldelay',
      'base': '',
      'fields': [
        { 'name': 'canceling_auth', 'type': 'permission_level' },
        { 'name': 'trx_id', 'type': 'transaction_id_type' }
      ]
    }, {
      'name': 'onerror',
      'base': '',
      'fields': [
        { 'name': 'sender_id', 'type': 'uint128' },
        { 'name': 'sent_trx', 'type': 'bytes' }
      ]
    }, {
      'name': 'buyrambytes',
      'base': '',
      'fields': [
        { 'name': 'payer', 'type': 'account_name' },
        { 'name': 'receiver', 'type': 'account_name' },
        { 'name': 'bytes', 'type': 'uint32' }
      ]
    }, {
      'name': 'sellram',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'bytes', 'type': 'uint64' }
      ]
    }, {
      'name': 'buyram',
      'base': '',
      'fields': [
        { 'name': 'payer', 'type': 'account_name' },
        { 'name': 'receiver', 'type': 'account_name' },
        { 'name': 'quant', 'type': 'asset' }
      ]
    }, {
      'name': 'delegatebw',
      'base': '',
      'fields': [
        { 'name': 'from', 'type': 'account_name' },
        { 'name': 'receiver', 'type': 'account_name' },
        { 'name': 'stake_net_quantity', 'type': 'asset' },
        { 'name': 'stake_cpu_quantity', 'type': 'asset' },
        { 'name': 'transfer', 'type': 'bool' }
      ]
    }, {
      'name': 'undelegatebw',
      'base': '',
      'fields': [
        { 'name': 'from', 'type': 'account_name' },
        { 'name': 'receiver', 'type': 'account_name' },
        { 'name': 'unstake_net_quantity', 'type': 'asset' },
        { 'name': 'unstake_cpu_quantity', 'type': 'asset' }
      ]
    }, {
      'name': 'refund',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' }
      ]
    }, {
      'name': 'delegated_bandwidth',
      'base': '',
      'fields': [
        { 'name': 'from', 'type': 'account_name' },
        { 'name': 'to', 'type': 'account_name' },
        { 'name': 'net_weight', 'type': 'asset' },
        { 'name': 'cpu_weight', 'type': 'asset' }
      ]
    }, {
      'name': 'user_resources',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' },
        { 'name': 'net_weight', 'type': 'asset' },
        { 'name': 'cpu_weight', 'type': 'asset' },
        { 'name': 'ram_bytes', 'type': 'uint64' }
      ]
    }, {
      'name': 'total_resources',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' },
        { 'name': 'net_weight', 'type': 'asset' },
        { 'name': 'cpu_weight', 'type': 'asset' },
        { 'name': 'ram_bytes', 'type': 'uint64' }
      ]
    }, {
      'name': 'refund_request',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' },
        { 'name': 'request_time', 'type': 'time_point_sec' },
        { 'name': 'net_amount', 'type': 'asset' },
        { 'name': 'cpu_amount', 'type': 'asset' }
      ]
    }, {
      'name': 'blockchain_parameters',
      'base': '',
      'fields': [

        { 'name': 'max_block_net_usage', 'type': 'uint64' },
        { 'name': 'target_block_net_usage_pct', 'type': 'uint32' },
        { 'name': 'max_transaction_net_usage', 'type': 'uint32' },
        { 'name': 'base_per_transaction_net_usage', 'type': 'uint32' },
        { 'name': 'net_usage_leeway', 'type': 'uint32' },
        { 'name': 'context_free_discount_net_usage_num', 'type': 'uint32' },
        { 'name': 'context_free_discount_net_usage_den', 'type': 'uint32' },
        { 'name': 'max_block_cpu_usage', 'type': 'uint32' },
        { 'name': 'target_block_cpu_usage_pct', 'type': 'uint32' },
        { 'name': 'max_transaction_cpu_usage', 'type': 'uint32' },
        { 'name': 'min_transaction_cpu_usage', 'type': 'uint32' },
        { 'name': 'max_transaction_lifetime', 'type': 'uint32' },
        { 'name': 'deferred_trx_expiration_window', 'type': 'uint32' },
        { 'name': 'max_transaction_delay', 'type': 'uint32' },
        { 'name': 'max_inline_action_size', 'type': 'uint32' },
        { 'name': 'max_inline_action_depth', 'type': 'uint16' },
        { 'name': 'max_authority_depth', 'type': 'uint16' }

      ]
    }, {
      'name': 'eosio_global_state',
      'base': 'blockchain_parameters',
      'fields': [
        { 'name': 'max_ram_size', 'type': 'uint64' },
        { 'name': 'total_ram_bytes_reserved', 'type': 'uint64' },
        { 'name': 'total_ram_stake', 'type': 'int64' },
        { 'name': 'last_producer_schedule_update', 'type': 'block_timestamp_type' },
        { 'name': 'last_pervote_bucket_fill', 'type': 'uint64' },
        { 'name': 'pervote_bucket', 'type': 'int64' },
        { 'name': 'perblock_bucket', 'type': 'int64' },
        { 'name': 'total_unpaid_blocks', 'type': 'uint32' },
        { 'name': 'total_activated_stake', 'type': 'int64' },
        { 'name': 'thresh_activated_stake_time', 'type': 'uint64' },
        { 'name': 'last_producer_schedule_size', 'type': 'uint16' },
        { 'name': 'total_producer_vote_weight', 'type': 'float64' },
        { 'name': 'last_name_close', 'type': 'block_timestamp_type' }
      ]
    }, {
      'name': 'producer_info',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' },
        { 'name': 'total_votes', 'type': 'float64' },
        { 'name': 'producer_key', 'type': 'public_key' },
        { 'name': 'is_active', 'type': 'bool' },
        { 'name': 'url', 'type': 'string' },
        { 'name': 'unpaid_blocks', 'type': 'uint32' },
        { 'name': 'last_claim_time', 'type': 'uint64' },
        { 'name': 'location', 'type': 'uint16' }
      ]
    }, {
      'name': 'regproducer',
      'base': '',
      'fields': [
        { 'name': 'producer', 'type': 'account_name' },
        { 'name': 'producer_key', 'type': 'public_key' },
        { 'name': 'url', 'type': 'string' },
        { 'name': 'location', 'type': 'uint16' }
      ]
    }, {
      'name': 'unregprod',
      'base': '',
      'fields': [
        { 'name': 'producer', 'type': 'account_name' }
      ]
    }, {
      'name': 'setram',
      'base': '',
      'fields': [
        { 'name': 'max_ram_size', 'type': 'uint64' }
      ]
    }, {
      'name': 'regproxy',
      'base': '',
      'fields': [
        { 'name': 'proxy', 'type': 'account_name' },
        { 'name': 'isproxy', 'type': 'bool' }
      ]
    }, {
      'name': 'voteproducer',
      'base': '',
      'fields': [
        { 'name': 'voter', 'type': 'account_name' },
        { 'name': 'proxy', 'type': 'account_name' },
        { 'name': 'producers', 'type': 'account_name[]' }
      ]
    }, {
      'name': 'voter_info',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' },
        { 'name': 'proxy', 'type': 'account_name' },
        { 'name': 'producers', 'type': 'account_name[]' },
        { 'name': 'staked', 'type': 'int64' },
        { 'name': 'last_vote_weight', 'type': 'float64' },
        { 'name': 'proxied_vote_weight', 'type': 'float64' },
        { 'name': 'is_proxy', 'type': 'bool' }
      ]
    }, {
      'name': 'claimrewards',
      'base': '',
      'fields': [
        { 'name': 'owner', 'type': 'account_name' }
      ]
    }, {
      'name': 'setpriv',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'is_priv', 'type': 'int8' }
      ]
    }, {
      'name': 'rmvproducer',
      'base': '',
      'fields': [
        { 'name': 'producer', 'type': 'account_name' }
      ]
    }, {
      'name': 'set_account_limits',
      'base': '',
      'fields': [
        { 'name': 'account', 'type': 'account_name' },
        { 'name': 'ram_bytes', 'type': 'int64' },
        { 'name': 'net_weight', 'type': 'int64' },
        { 'name': 'cpu_weight', 'type': 'int64' }
      ]
    }, {
      'name': 'set_global_limits',
      'base': '',
      'fields': [
        { 'name': 'cpu_usec_per_period', 'type': 'int64' }
      ]
    }, {
      'name': 'producer_key',
      'base': '',
      'fields': [
        { 'name': 'producer_name', 'type': 'account_name' },
        { 'name': 'block_signing_key', 'type': 'public_key' }
      ]
    }, {
      'name': 'set_producers',
      'base': '',
      'fields': [
        { 'name': 'schedule', 'type': 'producer_key[]' }
      ]
    }, {
      'name': 'require_auth',
      'base': '',
      'fields': [
        { 'name': 'from', 'type': 'account_name' }
      ]
    }, {
      'name': 'setparams',
      'base': '',
      'fields': [
        { 'name': 'params', 'type': 'blockchain_parameters' }
      ]
    }, {
      'name': 'connector',
      'base': '',
      'fields': [
        { 'name': 'balance', 'type': 'asset' },
        { 'name': 'weight', 'type': 'float64' }
      ]
    }, {
      'name': 'exchange_state',
      'base': '',
      'fields': [
        { 'name': 'supply', 'type': 'asset' },
        { 'name': 'base', 'type': 'connector' },
        { 'name': 'quote', 'type': 'connector' }
      ]
    }, {
      'name': 'namebid_info',
      'base': '',
      'fields': [
        { 'name': 'newname', 'type': 'account_name' },
        { 'name': 'high_bidder', 'type': 'account_name' },
        { 'name': 'high_bid', 'type': 'int64' },
        { 'name': 'last_bid_time', 'type': 'uint64' }
      ]
    }],
    'actions': [{
      'name': 'newaccount',
      'type': 'newaccount',
      'ricardian_contract': ''
    }, {
      'name': 'setcode',
      'type': 'setcode',
      'ricardian_contract': ''
    }, {
      'name': 'setabi',
      'type': 'setabi',
      'ricardian_contract': ''
    }, {
      'name': 'updateauth',
      'type': 'updateauth',
      'ricardian_contract': ''
    }, {
      'name': 'deleteauth',
      'type': 'deleteauth',
      'ricardian_contract': ''
    }, {
      'name': 'linkauth',
      'type': 'linkauth',
      'ricardian_contract': ''
    }, {
      'name': 'unlinkauth',
      'type': 'unlinkauth',
      'ricardian_contract': ''
    }, {
      'name': 'canceldelay',
      'type': 'canceldelay',
      'ricardian_contract': ''
    }, {
      'name': 'onerror',
      'type': 'onerror',
      'ricardian_contract': ''
    }, {
      'name': 'buyrambytes',
      'type': 'buyrambytes',
      'ricardian_contract': ''
    }, {
      'name': 'buyram',
      'type': 'buyram',
      'ricardian_contract': ''
    }, {
      'name': 'sellram',
      'type': 'sellram',
      'ricardian_contract': ''
    }, {
      'name': 'delegatebw',
      'type': 'delegatebw',
      'ricardian_contract': ''
    }, {
      'name': 'undelegatebw',
      'type': 'undelegatebw',
      'ricardian_contract': ''
    }, {
      'name': 'refund',
      'type': 'refund',
      'ricardian_contract': ''
    }, {
      'name': 'regproducer',
      'type': 'regproducer',
      'ricardian_contract': ''
    }, {
      'name': 'setram',
      'type': 'setram',
      'ricardian_contract': ''
    }, {
      'name': 'bidname',
      'type': 'bidname',
      'ricardian_contract': ''
    }, {
      'name': 'unregprod',
      'type': 'unregprod',
      'ricardian_contract': ''
    }, {
      'name': 'regproxy',
      'type': 'regproxy',
      'ricardian_contract': ''
    }, {
      'name': 'voteproducer',
      'type': 'voteproducer',
      'ricardian_contract': ''
    }, {
      'name': 'claimrewards',
      'type': 'claimrewards',
      'ricardian_contract': ''
    }, {
      'name': 'setpriv',
      'type': 'setpriv',
      'ricardian_contract': ''
    }, {
      'name': 'rmvproducer',
      'type': 'rmvproducer',
      'ricardian_contract': ''
    }, {
      'name': 'setalimits',
      'type': 'set_account_limits',
      'ricardian_contract': ''
    }, {
      'name': 'setglimits',
      'type': 'set_global_limits',
      'ricardian_contract': ''
    }, {
      'name': 'setprods',
      'type': 'set_producers',
      'ricardian_contract': ''
    }, {
      'name': 'reqauth',
      'type': 'require_auth',
      'ricardian_contract': ''
    }, {
      'name': 'setparams',
      'type': 'setparams',
      'ricardian_contract': ''
    }],
    'tables': [{
      'name': 'producers',
      'type': 'producer_info',
      'index_type': 'i64',
      'key_names': ['owner'],
      'key_types': ['uint64']
    }, {
      'name': 'global',
      'type': 'eosio_global_state',
      'index_type': 'i64',
      'key_names': [],
      'key_types': []
    }, {
      'name': 'voters',
      'type': 'voter_info',
      'index_type': 'i64',
      'key_names': ['owner'],
      'key_types': ['account_name']
    }, {
      'name': 'userres',
      'type': 'user_resources',
      'index_type': 'i64',
      'key_names': ['owner'],
      'key_types': ['uint64']
    }, {
      'name': 'delband',
      'type': 'delegated_bandwidth',
      'index_type': 'i64',
      'key_names': ['to'],
      'key_types': ['uint64']
    }, {
      'name': 'rammarket',
      'type': 'exchange_state',
      'index_type': 'i64',
      'key_names': ['supply'],
      'key_types': ['uint64']
    }, {
      'name': 'refunds',
      'type': 'refund_request',
      'index_type': 'i64',
      'key_names': ['owner'],
      'key_types': ['uint64']
    }, {
      'name': 'namebids',
      'type': 'namebid_info',
      'index_type': 'i64',
      'key_names': ['newname'],
      'key_types': ['account_name']
    }],
    'ricardian_clauses': [],
    'abi_extensions': []
  }
};
const { loadModels } = require('../../../extensions/tools/models');
const fetch = require('node-fetch');

let capturedEvents;
const loadEvents = async () => {
  if (!capturedEvents) {
    capturedEvents = {};
    var capturedEventsModels = await loadModels('captured-events');

    capturedEventsModels.forEach(a => {
      if (!a.eventType) {
        a.eventType = '*';
      }
      if (!a.contract) {
        a.contract = '*';
      }
      if (!a.method) {
        a.method = '*';
      }
      if (!capturedEvents[a.eventType]) {
        capturedEvents[a.eventType] = {};
      }
      if (!capturedEvents[a.eventType][a.contract]) {
        capturedEvents[a.eventType][a.contract] = {};
      }
      if (!capturedEvents[a.eventType][a.contract][a.method]) {
        capturedEvents[a.eventType][a.contract][a.method] = [];
      }
      capturedEvents[a.eventType][a.contract][a.method].push(a.webhook);
    });
  }
  return capturedEvents;
};
const handlers = {
  'eosio': (account, method, code, actData, events) => {
    // all methods
    if (method == 'onblock') {
      // console.log('.');
    } else if (method == 'newaccount') {
      // console.log(`new account: ${actData.name}`);
    } else if (method == 'setabi') {
      var localTypes = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abiabi);
      var buf = Buffer.from(actData.abi, 'hex');
      var buffer = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder()
      });
      buffer.pushArray(Serialize.hexToUint8Array(actData.abi));

      var abi = localTypes.get('abi_def').deserialize(buffer);
      abis[actData.account] = abi;
      console.log(`setabi for ${actData.account} - updating Serializer`);
    }
    // else
    //     console.log("system", account,method,code,actData, events);
  },
  '*': {
    '*': {
      '*': async (account, method, code, actData, event) => {
        // load from model.
        var events = await loadEvents();
        var curr = events;
        if (!curr[event.etype]) return;
        curr = curr[event.etype];
        if (!curr[code]) { curr = curr['*']; } else { curr = curr[code]; }
        if (!curr) return;

        if (!curr[method]) { curr = curr['*']; } else { curr = curr[method]; }
        if (curr) {
          Promise.all(curr.map(async url => {
            if (process.env.WEBHOOKS_HOST) {
              url = url.replace('http://localhost:', process.env.WEBHOOKS_HOST);
            }
            var r = await fetch(url, {
              headers: {
                'Content-Type': 'application/json'
              },
              method: 'POST',
              body: JSON.stringify({
                receiver: account,
                method,
                account: code,
                data: actData,
                event
              })
            });
            return r.text();
            // call webhook
          }));
          console.log('fired hooks:', account, method, event, code);
        }
        //     else
        //         console.log("catching all unhandled events:", account,method,code,actData, event);
      }
    }
  }
};
async function recursiveHandle ({ account, method, code, actData, events }, depth = 0, currentHandlers = handlers) {
  if (depth == 3) { return; }

  var key = account;
  if (depth == 2) {
    key = events;
    if (Array.isArray(key)) {
      for (var i = 0; i < key.length; i++) {
        var currentEvent = key[i];
        var eventType = currentEvent.etype;
        if (!eventType) { continue; }
        await recursiveHandle({ account, method, code, actData, events: currentEvent }, depth, currentHandlers);
      }
      return;
    }
    key = events.etype;
  }
  if (depth == 1) {
    key = method;
  }
  var subHandler = currentHandlers[key];
  if (!subHandler && depth == 0) {
    key = code;
    subHandler = currentHandlers[key];
  }
  if (!subHandler) { subHandler = currentHandlers['*']; }

  if (subHandler) {
    if (typeof subHandler === 'function') {
      return await subHandler(account, method, code, actData, events);
    } else if (typeof subHandler === 'object') {
      return recursiveHandle({ account, method, code, actData, events }, depth + 1, subHandler);
    } else {
      console.log(`got action: ${code}.${method} ${account == code ? '' : `(${account})`} - ${JSON.stringify(events)}`);
    }
  } else {
    console.log(`no handler for action: ${code}.${method} ${account == code ? '' : `(${account})`} - ${JSON.stringify(events)}`, currentHandlers, key);
  }
}

function parsedAction (account, method, code, actData, events) {
  var abi = abis[code];
  if (abi) {
    var localTypes = types = Serialize.getTypesFromAbi(types, abi);
    var action = abi.actions.find(a => a.name == method);
    if (action) {
      var buffer = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder()
      });
      buffer.pushArray(Serialize.hexToUint8Array(actData));
      var theType = localTypes.get(action.type);

      actData = theType.deserialize(buffer);
    }
  }
  return recursiveHandle({ account, method, code, actData, events });
}

async function parseEvents (text) {
  return text.split('\n').map(a => {
    if (a === '') { return null; }
    try {
      return JSON.parse(a);
    } catch (e) {}
  }).filter(a => a);
}

async function actionHandler (action) {
  if (Array.isArray(action)) { action = action[1]; }
  await parsedAction(action.receipt[1].receiver, action.act.name, action.act.account, action.act.data, await parseEvents(action.console));
  for (var i = 0; i < action.inline_traces.length; i++) {
    await actionHandler(action.inline_traces[i]);
  }
}

async function transactionHandler (tx) {
  var actionTraces = tx.action_traces;
  for (var i = 0; i < actionTraces.length; i++) {
    var actionTrace = actionTraces[i];
    await actionHandler(actionTrace);
  }
}
var c = 35000000;
var c2 = 0;
var types;
var head_block = 0;
var current_block = 0;
ws.on('message', async function incoming (data) {
  if (!expectingABI) {
    var buffer = new Serialize.SerialBuffer({
      textEncoder: new TextEncoder(),
      textDecoder: new TextDecoder(),
      array: data
    });

    const realData = types.get('result').deserialize(buffer);
    if (++c % 10000 == 0 && current_block === 0) { console.log(`syncing ${c / 1000000}M (${head_block / 1000000}M}`); }
    head_block = realData[1].head.block_num;
    if (!realData[1].traces) { return; }
    var traces = Buffer.from(realData[1].traces, 'hex');
    current_block = realData[1].this_block.block_num;
    if (++c2 % 10000 == 0) { console.log('at', current_block - head_block); }

    try {
      var n = traces.readUInt8(4);
      var n2 = traces.readUInt8(5);
      if (n != 120 || n2 != 156) {
        return;
      }
      const res = traces.slice(4);
      var output = pako.inflate(res);
      var buffer2 = new Serialize.SerialBuffer({
        textEncoder: new TextEncoder(),
        textDecoder: new TextDecoder(),
        array: output
      });

      var count = buffer2.getVaruint32();
      console.log('count', count);
      for (var i = 0; i < count; i++) {
        const transactionTrace = types.get('transaction_trace').deserialize(buffer2);
        await transactionHandler(transactionTrace[1]);
      }
    } catch (e) {
      console.error(e.message);
      return;
    }

    return;
  }
  console.log('got abi');
  var abi = JSON.parse(data);
  types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abi);

  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
    // console.log('types',types.get('request'));
    //   abiObjSer = eos.fc.abiCache.abi('request', abi);
  types.get('request').serialize(buffer, ['get_blocks_request_v0', {
    'start_block_num': 35000000,
    'end_block_num': 4294967295,
    'max_messages_in_flight': 4294967295,
    'have_positions': [],
    'irreversible_only': false,
    'fetch_block': true,
    'fetch_traces': true,
    'fetch_deltas': false
  }]);
  expectingABI = false;

  ws.send(buffer.asUint8Array());
});
