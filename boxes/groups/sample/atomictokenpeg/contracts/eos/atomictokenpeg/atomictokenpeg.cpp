#define LINK_PROTOCOL_ETHEREUM true
#define LINK_DEBUG //TO THE DEVELOPER - REMOVE THIS LINE FOR PRODUCTION - DISABLES LIB CHECK
#include "../dappservices/link.hpp"
#include "../atomicassets/atomicdata.hpp"
#define CONTRACT_NAME() atomictokenpeg

// #define LINK_PROCESSING_TIMEOUT 300

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) message_received(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) receipt_received(receipt)

#undef MESSAGE_RECEIVED_FAILURE_HOOK	
#define MESSAGE_RECEIVED_FAILURE_HOOK(message,id) message_received_failed(message,id)	

#undef MESSAGE_RECEIPT_FAILURE_HOOK	
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) receipt_received_failed(receipt)

using namespace std;
using namespace eosio;

const name NFT_ACCOUNT = "atomicassets"_n;

CONTRACT_START()

  LINK_BOOTSTRAP()

  struct message_t {
    bool success;
    name account;            
    uint64_t asset_id;
    checksum160 address;
  };
  
  TABLE assets_s {
    uint64_t         asset_id;
    name             collection_name;
    name             schema_name;
    int32_t          template_id;
    name             ram_payer;
    vector <asset>   backed_tokens;
    vector <uint8_t> immutable_serialized_data;
    vector <uint8_t> mutable_serialized_data;
    uint64_t primary_key() const { return asset_id; };
  };
  typedef multi_index <name("assets"), assets_s> assets_t;
  typedef eosio::singleton<"assets"_n, assets_s> assets_singleton_t;

  //Scope: collection_name
  TABLE schemas_s {
    name            schema_name;
    vector <atomicdata::FORMAT> format;
    uint64_t primary_key() const { return schema_name.value; }
  };
  typedef multi_index <name("schemas"), schemas_s> schemas_t;

  #ifdef LINK_DEBUG 
    TABLE history {
      uint64_t id;
      string type;
      vector<char> data;
      message_t msg;
      uint64_t primary_key()const { return id; }
    };
    typedef eosio::multi_index<"history"_n, history> history_table;
  #endif

  TABLE refunds {
    uint64_t receipt_id;
    vector<char> data;
    message_t msg;
    uint64_t primary_key()const { return receipt_id; }
  };
  typedef eosio::multi_index<"refunds"_n, refunds> refunds_table;

  string clean_eth_address(string address) {
    // remove initial 0x if there
    if (address[1] == 'x') {
        return address.substr(2);
    }
    return address;
  }

  vector<char> HexToBytes(const string& hex) {
    vector<char> bytes;
    for (unsigned int i = 0; i < hex.length(); i += 2) {
        string byteString = hex.substr(i, 2);
        char byte = (char) strtol(byteString.c_str(), NULL, 16);
        bytes.push_back(byte);
    }
    return bytes;
  }

  // string BytesToHex(vector<char> data)
  // {
  //   string s(data.size() * 2, ' ');
  //   char hexmap[] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};
  //   for (int i = 0; i < data.size(); ++i) {
  //       s[2 * i]     = hexmap[(data[i] & 0xF0) >> 4];
  //       s[2 * i + 1] = hexmap[data[i] & 0x0F];
  //   }
  //   return s;
  // }

  eosio::checksum160 HexToAddress(const string& hex) {
    auto bytes = HexToBytes(clean_eth_address(hex));
    array<uint8_t, 20> arr;
    copy_n(bytes.begin(), 20, arr.begin());
    return eosio::checksum160(arr);
  }

  // string AddressToHex(const eosio::checksum160& address) {
  //   vector<char> bytes;
  //   auto arr = address.extract_as_byte_array();
  //   copy_n(arr.begin(), 20, bytes.begin());
  //   return BytesToHex(bytes);
  // }

  int64_t reverse(int64_t value) {
    vector<char> value_v(8);
    vector<char> value_r(8);
    int64_t reversed;

    memcpy(value_v.data(), &value, value_v.size());
    reverse_copy(&value_v[0], &value_v[8], &value_r[0]);
    memcpy(&reversed, value_r.data(), value_r.size());
    return reversed;
  }

  message_t unpack(const vector<char>& data) {
    auto unpacked = eosio::unpack<message_t>(data);
    auto _asset_id = unpacked.asset_id;
    unpacked.asset_id = reverse(_asset_id);
    return unpacked;
  }

  vector<char> pack(const message_t& data) {
    auto _data = data;
    _data.asset_id = reverse(_data.asset_id);
    auto packed = eosio::pack(_data);
    return packed;
  }

  TABLE token_settings_t {
    name token_contract;
    // symbol token_symbol;
    // uint64_t min_transfer;
    bool transfers_enabled;
    bool can_issue; // true if token is being bridged to this chain, else false 
  };
  typedef eosio::singleton<"config"_n, token_settings_t> token_settings_table;
  typedef eosio::multi_index<"config"_n, token_settings_t> token_settings_table_abi;

  TABLE config_s {
    uint64_t                 asset_counter     = 1099511627776; //2^40
    int32_t                  template_counter  = 1;
    uint64_t                 offer_counter     = 1;
    vector <atomicdata::FORMAT>          collection_format = {};
    vector <extended_symbol> supported_tokens  = {};
  };
  typedef singleton <name("config"), config_s> config_t;

  TABLE mapping_s {
    uint64_t                 current_id;
    uint64_t                 transferred_asset_id;
    uint64_t primary_key() const { return current_id; };
  };
  typedef multi_index <name("nftmapping"), mapping_s> mapping_t;

  [[eosio::action]]
  void init(
    string sister_address,
    string sister_msig_address,
    string sister_chain_name,
    string this_chain_name,
    bool processing_enabled,
    name token_contract,
    // symbol token_symbol,
    // uint64_t min_transfer,
    bool transfers_enabled,
    bool can_issue // true if token is being bridged to this chain, else false 
  )
  {
      require_auth(_self);
      initlink(
          sister_address,
          sister_msig_address,
          sister_chain_name,
          this_chain_name,
          processing_enabled
      );
      token_settings_table settings_singleton(_self, _self.value);
      token_settings_t settings = settings_singleton.get_or_default();
      settings.token_contract = token_contract;
      // settings.token_symbol = token_symbol;
      // settings.min_transfer = min_transfer;
      settings.can_issue = can_issue;
      settings.transfers_enabled = transfers_enabled;
      settings_singleton.set(settings, _self);
  }

  [[eosio::action]]
  void enable(bool processing_enabled, bool transfers_enabled)
  {
      require_auth(_self);
      enablelink(processing_enabled);
      token_settings_table settings_singleton(_self, _self.value);
      token_settings_t settings = settings_singleton.get_or_default();
      settings.transfers_enabled = transfers_enabled;
      settings_singleton.set(settings, _self);
  }

  [[eosio::action]]
  void disable(name timer, bool processing_enabled = false, bool transfers_enabled = false)
  {
      require_auth(_self);
      disablelink(timer, processing_enabled);
      token_settings_table settings_singleton(_self, _self.value);
      token_settings_t settings = settings_singleton.get_or_default();
      settings.transfers_enabled = transfers_enabled;
      settings_singleton.set(settings, _self);
  }

  [[eosio::action]]
  void getdest(name from) {
    string res = "Destination EOSIO Account Name Value: " + to_string(from.value);
    check(false, res);
  }

  [[eosio::action]]
  void refund(uint64_t receipt_id) {
    require_auth(_self);
    refunds_table refunds(_self, _self.value);
    auto iterator = refunds.find(receipt_id);
    check(iterator != refunds.end(), "no refund exists");
    pushMessage(iterator->data);
    refunds.erase(iterator);
  }

  [[eosio::action]]
  void clearhist(uint64_t id) {
    require_auth(_self);
    history_table histories(_self, _self.value);
    auto iterator = histories.find(id);
    check(iterator != histories.end(), "no history entry exists");
    histories.erase(iterator);
  }
  
  // used if bridging existing erc721
  [[eosio::action]]
  void evmeossetup(name collection_name, name schema_name, int32_t template_id, atomicdata::ATTRIBUTE_MAP immutable_data, atomicdata::ATTRIBUTE_MAP mutable_data) {
    require_auth(_self);
    assets_singleton_t settings_singleton(_self, _self.value);
    assets_s settings = settings_singleton.get_or_default();
    settings.collection_name = collection_name;
    settings.schema_name = schema_name;
    settings.template_id = template_id;
    schemas_t schema_formats(NFT_ACCOUNT,collection_name.value);	
    auto schema_itr = schema_formats.find(settings.schema_name.value);
    settings.immutable_serialized_data = serialize(immutable_data, schema_itr->format);
    settings.mutable_serialized_data = serialize(mutable_data, schema_itr->format);
    settings_singleton.set(settings, _self);
  }
  
  void transfer(name from, name to, vector <uint64_t> asset_ids, string memo) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    // validate proper transfer
    if (get_first_receiver() != settings.token_contract || from == _self || get_first_receiver() != NFT_ACCOUNT || to != get_self()) {
      return;
    }
    check(sizeof(asset_ids) > 0, "no nfts being transferred");
    check(settings.transfers_enabled, "transfers disabled");
    
    // the memo should contain ONLY the eth address.
    for (uint64_t asset_id : asset_ids) {
      if(settings.can_issue) {
        // create custom message_t message
        mapping_t mapping_table(_self,asset_id);
        auto existing = mapping_table.find(asset_id);
        if(existing != mapping_table.end()) {
          message_t new_transfer = { true, from, existing->transferred_asset_id, HexToAddress(memo) };
          auto transfer = pack(new_transfer);

          // burn nft
          action(permission_level{_self, "active"_n}, settings.token_contract, "burnasset"_n,
            std::make_tuple(_self, asset_id))
          .send();
          #ifdef LINK_DEBUG    
            history_table histories(_self, _self.value);
            histories.emplace(_self, [&]( auto& a ){
              a.id = histories.available_primary_key();
              a.data = transfer;
              a.msg = new_transfer;
              a.type = "outgoingMessage";
            });
          #endif
          pushMessage(transfer);
          remove_mapping(asset_id);
        } else {
          // check(false,"should not get here");
          // mint_asset(asset_id,to,settings.token_contract);
        }
      } else {
        message_t new_transfer = { true, from, asset_id, HexToAddress(memo) };
        auto transfer = pack(new_transfer);
        #ifdef LINK_DEBUG    
          history_table histories(_self, _self.value);
          histories.emplace(_self, [&]( auto& a ){
            a.id = histories.available_primary_key();
            a.data = transfer;
            a.msg = new_transfer;
            a.type = "outgoingMessage";
          });
        #endif
        pushMessage(transfer);
      }
    }
  }

  vector<char> message_received(const vector<char>& data) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    auto orig_data = data;      
    auto transfer_data = unpack(data);

    string memo = "LiquidApps LiquidLink Transfer - Received from Ethereum account 0x";// + AddressToHex(transfer_data.address);

    //TODO: We should check for things like destination account exists, funds are available, a token account exists, etc
    // and then we should be able to return that the message is a failure if those conditions don't pass
    // asset quantity = asset(transfer_data.amount, settings.token_symbol);    
    uint64_t asset_id = transfer_data.asset_id;    
    vector<uint64_t> asset_ids;    
    asset_ids.push_back(asset_id);
    if (settings.can_issue) {
      mint_asset(asset_id,name(transfer_data.account),settings.token_contract);
    } else {
      action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
        make_tuple(_self, name(transfer_data.account), asset_ids, memo))
      .send();
    }

    #ifdef LINK_DEBUG  
      history_table histories(_self, _self.value);
      histories.emplace(_self, [&]( auto& a ){
        a.id = histories.available_primary_key();
        a.data = orig_data;
        a.msg = transfer_data;
        a.type = "incomingMessage";
      });
    #endif

    return orig_data;
  }

  void message_received_failed(const vector<char>& data, uint64_t id) {
    auto transfer_data = unpack(data);
    transfer_data.success = false;
    auto packed_data = pack(transfer_data);
    history_table histories(_self, _self.value);
    histories.emplace(_self, [&]( auto& a ){
      a.id = histories.available_primary_key();
      a.data = packed_data;
      a.msg = transfer_data;
      a.type = "incomingMessageFailure";
    });
    refunds_table refunds(_self, _self.value);
    refunds.emplace(_self, [&]( auto& a ){
      a.data = packed_data;
      a.receipt_id = id;
      a.msg = transfer_data;
    });
  }

  void receipt_received(const vector<char>& data) {
    // deserialize original message to get the quantity and original sender to refund
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    auto transfer_receipt = unpack(data);

    string memo = "LiquidApps LiquidLink Transfer Failed - Attempted to send to Ethereum account 0x";// + AddressToHex(transfer_receipt.address);
    uint64_t asset_id = transfer_receipt.asset_id;    
    vector<uint64_t> asset_ids;    
    asset_ids.push_back(asset_id);

    if (!transfer_receipt.success) {
      // return locked tokens in case of failure
      if (settings.can_issue) {
        mint_asset(asset_id,name(transfer_receipt.account),settings.token_contract);
      } else {
        action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
          make_tuple(_self, name(transfer_receipt.account), asset_ids, memo))
        .send();
      }

      #ifdef LINK_DEBUG 
        history_table histories(_self, _self.value);
        histories.emplace(_self, [&]( auto& a ){
          a.id = histories.available_primary_key();
          a.data = data;
          a.msg = transfer_receipt;
          a.type = "receiptFailure";
        });
      #endif
    } else {
      #ifdef LINK_DEBUG 
        //TODO: should we burn the tokens or send them to a "holding account"
        history_table histories(_self, _self.value);
        histories.emplace(_self, [&]( auto& a ){
          a.id = histories.available_primary_key();
          a.data = data;
          a.msg = transfer_receipt;
          a.type = "receiptSuccess";
        });
      #endif  
    }
  }

  // mark receipt as failed and store in failed messages table
  void receipt_received_failed(message_payload& receipt) { 
    auto failed_receipt = unpack(receipt.data);
    failed_receipt.success = false;
    auto failed_receipt_packed = eosio::pack(failed_receipt);
    receipt.data = failed_receipt_packed;
    // add failed receipt to fmessages table
    failed_messages_table_t failed_messages(_self, _self.value);
    auto failed = failed_messages.find(receipt.id);
    if(failed == failed_messages.end()) {
        failed_messages.emplace(_self, [&](auto& a){
            a.message = receipt;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
  }

  void create_mapping(uint64_t transferred_asset_id) {
    config_t config_table(NFT_ACCOUNT,NFT_ACCOUNT.value);
    config_s current_config = config_table.get();
    uint64_t new_asset_id = current_config.asset_counter;
    mapping_t mapping_table(_self,new_asset_id);
    auto existing = mapping_table.find(new_asset_id);
    if(existing == mapping_table.end()) {
        mapping_table.emplace(_self, [&](auto& a){
            a.current_id = new_asset_id;
            a.transferred_asset_id = transferred_asset_id;
        });
    }
  }

  void remove_mapping(uint64_t removed_asset_id) {
    mapping_t mapping_table(_self,removed_asset_id);
    auto existing = mapping_table.find(removed_asset_id);
    if(existing != mapping_table.end()) {
        mapping_table.erase(existing);
    } else {
      check(false,"should not get here remove mapping");
    }
  }

  void mint_asset(uint64_t asset_id, name to, name token_contract) {
    assets_singleton_t settings_singleton(_self, _self.value);
    assets_s settings = settings_singleton.get_or_default();
    schemas_t schema_formats(NFT_ACCOUNT,settings.collection_name.value);	
    auto schema_itr = schema_formats.find(settings.schema_name.value);
    vector <eosio::asset> tokens_to_back;
    atomicdata::ATTRIBUTE_MAP deserialized_immutable_data = deserialize(
      settings.immutable_serialized_data,
      schema_itr->format
    );
    atomicdata::ATTRIBUTE_MAP deserialized_mutable_data = deserialize(
      settings.mutable_serialized_data,
      schema_itr->format
    );
    action(permission_level{_self, "active"_n}, token_contract, "mintasset"_n,
      make_tuple(_self, settings.collection_name, settings.schema_name, settings.template_id, to, deserialized_immutable_data, deserialized_mutable_data, tokens_to_back))
    .send();
    create_mapping(asset_id);
  }
};

extern "C" {
  void apply(uint64_t receiver, uint64_t code, uint64_t action) {
    if (code == NFT_ACCOUNT.value && action == name("transfer").value) {
      eosio::execute_action(eosio::name(receiver), eosio::name(code),
                            &CONTRACT_NAME()::transfer);
    }
    else {
      switch (action) {
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), DAPPSERVICE_ACTIONS_COMMANDS())
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (init)(enable)(getdest)(disable)(refund)(clearhist)(evmeossetup))
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (xsignal))
      }
    }
    eosio_exit(0);
  }
}
