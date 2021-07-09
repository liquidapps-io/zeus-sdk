#define LINK_DEBUG //TO THE DEVELOPER - REMOVE THIS LINE FOR PRODUCTION - DISABLES LIB CHECK
#include "../dappservices/link.hpp"
#include "../atomicassets/atomicdata.hpp"
#define CONTRACT_NAME() atomictokenpegeosio

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) message_received(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) receipt_received(receipt)

#undef MESSAGE_RECEIVED_FAILURE_HOOK	
#define MESSAGE_RECEIVED_FAILURE_HOOK(message) message_received_failed(message)	

#undef MESSAGE_RECEIPT_FAILURE_HOOK	
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) receipt_received_failed(receipt)

using namespace std;
using namespace eosio;

const name NFT_ACCOUNT = "atomicassemn"_n;

CONTRACT_START()

  LINK_BOOTSTRAP()

  struct message_t {
    bool success;
    name from_account;
    string to_account;
    string to_chain;   
    uint64_t asset_id;
    name             collection_name;
    name             schema_name;
    int32_t          template_id;
    vector <asset>   backed_tokens;
    vector <uint8_t> immutable_serialized_data;
    vector <uint8_t> mutable_serialized_data;
    vector <atomicdata::FORMAT> schema_format;
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
    name sister_code,
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
          sister_code,
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

  vector<string> split(const string& str, const string& delim) {
    vector<string> tokens;
    size_t prev = 0, pos = 0;
    do {
      pos = str.find(delim, prev);
      if (pos == string::npos) pos = str.length();
      string token = str.substr(prev, pos-prev);
      tokens.push_back(token);
      prev = pos + delim.length();
    } while (pos < str.length() && prev < str.length());

    return tokens;
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
    // check for asset length of only 1
    // to_account,to_chain is memo format
    vector<string> split_memo = split(memo, ",");
    for (uint64_t asset_id : asset_ids) {      
      assets_t assets_table(NFT_ACCOUNT,_self.value);
      const auto& asset = assets_table.get( asset_id, "no nft found" );
      schemas_t schema_formats(NFT_ACCOUNT,asset.collection_name.value);	
      auto schema_itr = schema_formats.find(asset.schema_name.value);
      if(settings.can_issue) {
        // create custom message_t message
        mapping_t mapping_table(_self,asset_id);
        auto existing = mapping_table.find(asset_id);
        if(existing != mapping_table.end()) {
          message_t new_transfer = { true, from, split_memo[0], split_memo[1], existing->transferred_asset_id, asset.collection_name, asset.schema_name, asset.template_id, asset.backed_tokens, asset.immutable_serialized_data, asset.mutable_serialized_data, schema_itr->format };
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
          // mint_asset(asset_id,name(split_memo[0]),settings.token_contract,asset);
          check(false,"should not get here transfer");
          // vector <eosio::asset> tokens_to_back;
          // atomicdata::ATTRIBUTE_MAP deserialized_immutable_data = deserialize(
          //   asset.immutable_serialized_data,
          //   schema_itr->format
          // );
          // atomicdata::ATTRIBUTE_MAP deserialized_mutable_data = deserialize(
          //   asset.mutable_serialized_data,
          //   schema_itr->format
          // );
          // action(permission_level{_self, "active"_n}, settings.token_contract, "mintasset"_n,
          //   make_tuple(_self, asset.collection_name, asset.schema_name, asset.template_id, to, deserialized_immutable_data, deserialized_mutable_data, tokens_to_back))
          // .send();
          // create_mapping(asset_id);
        }
      } else {
        message_t new_transfer = { true, from, split_memo[0], split_memo[1], asset_id, asset.collection_name, asset.schema_name, asset.template_id, asset.backed_tokens, asset.immutable_serialized_data, asset.mutable_serialized_data, schema_itr->format };
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
    auto transfer_data = eosio::unpack<message_t>(data);

    std::string memo = "LiquidApps LiquidLink Transfer - Received";

    //TODO: We should check for things like destination account exists, funds are available, a token account exists, etc
    // and then we should be able to return that the message is a failure if those conditions don't pass
    // asset quantity = asset(transfer_data.amount, settings.token_symbol);    
    uint64_t asset_id = transfer_data.asset_id;    
    vector<uint64_t> asset_ids;    
    asset_ids.push_back(asset_id);
    if (settings.can_issue) {
        mint_asset(asset_id,name(transfer_data.to_account),settings.token_contract,transfer_data);
    } else {
      action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
        make_tuple(_self, name(transfer_data.to_account), asset_ids, memo))
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

  // mark message as failed and return
  vector<char> message_received_failed(const vector<char>& message) {
    auto failed_message = eosio::unpack<message_t>(message);
    failed_message.success = false;
    auto packed_data = pack(failed_message);
    return packed_data;
  } 

  void receipt_received(const vector<char>& data) {
    // deserialize original message to get the quantity and original sender to refund
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    auto transfer_receipt = eosio::unpack<message_t>(data);

    std::string memo = "LiquidApps LiquidLink Transfer Failed - Refund Processed";
    // asset quantity = asset(transfer_receipt.amount, settings.token_symbol);
    uint64_t asset_id = transfer_receipt.asset_id;    
    vector<uint64_t> asset_ids;    
    asset_ids.push_back(asset_id);

    if (!transfer_receipt.success) {
      // return locked tokens in case of failure
      if (settings.can_issue) {
        mint_asset(asset_id,name(transfer_receipt.from_account),settings.token_contract,transfer_receipt);
      } else {
        action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
          make_tuple(_self, name(transfer_receipt.from_account), asset_ids, memo))
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
    auto failed_receipt = eosio::unpack<message_t>(receipt.data);
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
    //  else {
    //   mapping_table.modify(existing,_self, [&]( auto& a ){
    //     a.current_id = new_asset_id;
    //     a.transferred_asset_id = transferred_asset_id;
    //   });
    // }
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

  void mint_asset(uint64_t asset_id, name to, name token_contract,message_t message) {
    vector <eosio::asset> tokens_to_back;
    atomicdata::ATTRIBUTE_MAP deserialized_immutable_data = deserialize(
      message.immutable_serialized_data,
      message.schema_format
    );
    atomicdata::ATTRIBUTE_MAP deserialized_mutable_data = deserialize(
      message.mutable_serialized_data,
      message.schema_format
    );
    action(permission_level{_self, "active"_n}, token_contract, "mintasset"_n,
      make_tuple(_self, message.collection_name, message.schema_name, message.template_id, to, deserialized_immutable_data, deserialized_mutable_data, tokens_to_back))
    .send();
    create_mapping(message.asset_id);
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
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (init)(enable)(getdest)(disable))
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (xsignal))
      }
    }
    eosio_exit(0);
  }
}
