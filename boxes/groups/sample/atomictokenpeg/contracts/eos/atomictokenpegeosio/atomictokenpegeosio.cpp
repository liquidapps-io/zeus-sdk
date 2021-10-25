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

const name NFT_ACCOUNT = "atomicassets"_n;

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

  TABLE collections_s {
      name             collection_name;
      name             author;
      bool             allow_notify;
      vector <name>    authorized_accounts;
      vector <name>    notify_accounts;
      double           market_fee;
      vector <uint8_t> serialized_data;

      uint64_t primary_key() const { return collection_name.value; };
  };

  typedef multi_index <name("collections"), collections_s> collections_t;

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
    bool transfers_enabled;
    bool can_issue;
  };
  typedef eosio::singleton<"config"_n, token_settings_t> token_settings_table;
  typedef eosio::multi_index<"config"_n, token_settings_t> token_settings_table_abi;

  TABLE config_s {
    uint64_t                 asset_counter     = 1099511627776;
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

  struct asset_entry {
    name             collection_name;
    name             schema_name;
    int32_t          template_id;
    name             collection_name_mapping;
    name             schema_name_mapping;
    int32_t          template_id_mapping;
    vector <uint8_t> immutable_serialized_data;
  };

  TABLE templatemap_s {
      name             author;
      vector<asset_entry>  asset_entries;

      uint64_t primary_key() const { return author.value; };
  };

  typedef multi_index <name("templatemap"), templatemap_s> templatemap_t;

  [[eosio::action]]
  void init(
    name sister_code,
    string sister_chain_name,
    string this_chain_name,
    bool processing_enabled,
    name token_contract,
    bool transfers_enabled,
    bool can_issue
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

  // register mapping
  [[eosio::action]]
  void regmapping(
    name collection_name,
    name schema_name, 
    int32_t template_id, 
    name collection_name_mapping, 
    name schema_name_mapping, 
    int32_t template_id_mapping, 
    atomicdata::ATTRIBUTE_MAP immutable_data
  ) {
    schemas_t schema_formats(NFT_ACCOUNT,collection_name.value);	
    auto schema_itr = schema_formats.find(schema_name.value);

    vector <uint8_t> immutable_serialized_data = serialize(immutable_data, schema_itr->format);
    
    vector<asset_entry> asset_entries;
    asset_entries.push_back({
      collection_name,
      schema_name,
      template_id,
      collection_name_mapping,
      schema_name_mapping,
      template_id_mapping,
      immutable_serialized_data
    });

    collections_t collections_table(NFT_ACCOUNT,NFT_ACCOUNT.value);
    const auto& collection = collections_table.get( collection_name.value, "no collection found" );

    require_auth(collection.author);

    templatemap_t templatemap_table(_self,collection.author.value);
    auto templatemap = templatemap_table.find(collection.author.value);
    if(templatemap == templatemap_table.end()) {
      templatemap_table.emplace(collection.author, [&](auto& a){
          a.author = collection.author;
          a.asset_entries = asset_entries;
      });
    } else {
      bool found = false;
      for(auto template_id_itr : templatemap->asset_entries) {
        if(
          (
            template_id_itr.collection_name_mapping == collection_name_mapping
            && template_id_itr.template_id_mapping == template_id_mapping
            && template_id_itr.immutable_serialized_data == immutable_serialized_data
          )
          ||
          (
            template_id_itr.collection_name == collection_name
            && template_id_itr.template_id == template_id
            && template_id_itr.immutable_serialized_data == immutable_serialized_data
          )
        ) {
          found = true;
        }
        asset_entries.push_back(template_id_itr);
      }
      check(!found,"nft already mapped");
      templatemap_table.modify(templatemap,collection.author, [&]( auto& a ){
        a.asset_entries = asset_entries;
      });
    }
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
    
    vector<string> split_memo = split(memo, ",");
    check(split_memo.size() == 2, "memo must include account,destination_chain");
    for (uint64_t asset_id : asset_ids) {      
      assets_t assets_table(NFT_ACCOUNT,_self.value);
      const auto& asset = assets_table.get( asset_id, "no nft found" );
      schemas_t schema_formats(NFT_ACCOUNT,asset.collection_name.value);	
      auto schema_itr = schema_formats.find(asset.schema_name.value);
      if(settings.can_issue) {
        mapping_t mapping_table(_self,asset_id);
        auto existing = mapping_table.find(asset_id);
        if(existing != mapping_table.end()) {
          message_t new_transfer = { true, from, split_memo[0], split_memo[1], existing->transferred_asset_id, asset.collection_name, asset.schema_name, asset.template_id, asset.immutable_serialized_data, asset.mutable_serialized_data, schema_itr->format };
          auto transfer = pack(new_transfer);
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
          check(false,"should not get here transfer");
        }
      } else {
        asset_entry map = verifyMapping(asset_id);
        message_t new_transfer = { 
          true, 
          from, 
          split_memo[0], 
          split_memo[1], 
          asset_id, 
          map.collection_name_mapping, 
          map.schema_name_mapping, 
          map.template_id_mapping, 
          asset.immutable_serialized_data, 
          asset.mutable_serialized_data, 
          schema_itr->format 
        };
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

  asset_entry verifyMapping(const uint64_t asset_id) {
    assets_t assets_table(NFT_ACCOUNT,_self.value);
    const auto& asset = assets_table.get( asset_id, "no nft found" );
    collections_t collections_table(NFT_ACCOUNT,NFT_ACCOUNT.value);
    const auto& collection = collections_table.get( asset.collection_name.value, "no collection found for asset" );
    templatemap_t templatemap_table(_self,collection.author.value);
    const auto& templatemap = templatemap_table.get( collection.author.value, "no templatemap found, collection author must create" );
    for (auto asset_entry : templatemap.asset_entries) {
      if(asset_entry.template_id == asset.template_id
        && asset_entry.schema_name == asset.schema_name
        && asset_entry.collection_name == asset.collection_name
        && asset_entry.immutable_serialized_data == asset.immutable_serialized_data
      ) {
        return asset_entry;
      }
    }
    check(false, "template id mapping not found");
  }

  asset_entry verifyRegistered(name collection_name, name schema_name, int32_t template_id, vector <uint8_t> immutable_serialized_data) {
    collections_t collections_table(NFT_ACCOUNT,NFT_ACCOUNT.value);
    const auto& collection = collections_table.get( collection_name.value, "no collection found for asset" );
    templatemap_t templatemap_table(_self,collection.author.value);
    const auto& templatemap = templatemap_table.get( collection.author.value, "no templatemap found, collection author must create" );
    for (auto asset_entry : templatemap.asset_entries) {
      if(asset_entry.template_id == template_id
        && asset_entry.schema_name == schema_name
        && asset_entry.collection_name == collection_name
        && asset_entry.immutable_serialized_data == immutable_serialized_data
      ) {
        return asset_entry;
      }
    }
    check(false, "template id mapping not found");
  }

  vector<char> message_received(const vector<char>& data) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    auto orig_data = data;      
    auto transfer_data = eosio::unpack<message_t>(data);
    std::string memo = "LiquidApps LiquidLink Transfer - Received";
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
    asset_entry map = verifyRegistered(message.collection_name, message.schema_name, message.template_id, message.immutable_serialized_data);
    action(permission_level{_self, "active"_n}, token_contract, "mintasset"_n,
      make_tuple(_self, map.collection_name, map.schema_name, map.template_id, to, deserialized_immutable_data, deserialized_mutable_data, tokens_to_back))
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
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (init)(enable)(getdest)(disable)(regmapping))
        EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (xsignal))
      }
    }
    eosio_exit(0);
  }
}
