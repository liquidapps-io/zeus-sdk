#define LIQUIDX
#include "../dappservices/link.hpp"
#define CONTRACT_NAME() tokenpegx

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) message_received(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) receipt_received(receipt)

#undef MESSAGE_RECEIVED_FAILURE_HOOK
#define MESSAGE_RECEIVED_FAILURE_HOOK(message) message_received_failed(message)

#undef MESSAGE_RECEIPT_FAILURE_HOOK
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) receipt_received_failed(receipt)

// default time to wait before processing is 60s
// #define LINK_PROCESSING_TIMEOUT 180

CONTRACT_START()

  LINK_BOOTSTRAP()

  struct message_t {
    bool success;
    name from_account;
    string to_account;
    string to_chain;
    asset received_amount;
  };

  TABLE token_settings_t {
    name token_contract;
    symbol token_symbol;
    uint64_t min_transfer;
    bool transfers_enabled;
    bool can_issue; // true if token is being bridged to this chain, else false 
  };
  typedef eosio::singleton<"config"_n, token_settings_t> token_settings_table;
  typedef eosio::multi_index<"config"_n, token_settings_t> token_settings_table_abi;

  /*
    example
    {
      "sister_code": "testpegxm",
      "sister_chain_name": "localmainnet",
      "this_chain_name": "test1",
      "processing_enabled": true,
      "token_contract": "tpgsidechain",
      "token_symbol": "4,TKN",
      "min_transfer": "10000",
      "transfers_enabled": true,
      "can_issue": true
    }
  */

  // initialize bridge
  [[eosio::action]]
  void init(
    name sister_code,
    string sister_chain_name,
    string this_chain_name,
    bool processing_enabled,
    name token_contract,
    symbol token_symbol,
    uint64_t min_transfer,
    bool transfers_enabled,
    bool can_issue // true if token is being bridged to this chain, else false 
  )
  {
      require_auth(_self);
      /*
        Start all crons
        tokenpegx:packbatches
        tokenpegx:getbatches
        tokenpegx:unpkbatches
        tokenpegx:hndlmessage
      */
      initlink(
          sister_code,
          sister_chain_name,
          this_chain_name,
          processing_enabled
      );
      
      token_settings_table settings_singleton(_self, _self.value);
      token_settings_t settings = settings_singleton.get_or_default();
      settings.token_contract = token_contract;
      settings.token_symbol = token_symbol;
      settings.min_transfer = min_transfer;
      settings.transfers_enabled = transfers_enabled;
      settings.can_issue = can_issue;
      settings_singleton.set(settings, _self);
      //Add additional init logic as neccessary
  }

  // stop/start bridge, enable/disable transfers to/from contract
  [[eosio::action]]
  void enable(bool processing_enabled, bool transfers_enabled)
  {
      require_auth(_self);
      enablelink(processing_enabled);
      token_settings_table settings_singleton(_self, _self.value);
      token_settings_t settings = settings_singleton.get_or_default();
      settings.transfers_enabled = transfers_enabled;
      settings_singleton.set(settings, _self);
      //Add additional enabling logic as neccessary
  }

  [[eosio::action]]
  void disable(name timer, bool processing_enabled)
  {
      require_auth(_self);
      disablelink(timer, processing_enabled);
  }

  vector<char> message_received(const std::vector<char>& message) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    eosio::check(message.size(), "no message data received");
    auto orig_data = message;    
      
    auto transfer_data = eosio::unpack<message_t>(message);
    std::string memo = "LiquidApps LiquidLink Transfer - Received";
    
    if (settings.can_issue) {
      action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
        std::make_tuple(_self, transfer_data.received_amount, memo))
      .send();
      action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
        std::make_tuple(_self, name(transfer_data.to_account), transfer_data.received_amount, memo))
      .send();
    } else {
      action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
        std::make_tuple(_self, name(transfer_data.to_account), transfer_data.received_amount, memo))
      .send();
    }
    return orig_data;
  } 

  // mark message as failed and return
  vector<char> message_received_failed(const std::vector<char>& message) {
    auto failed_message = eosio::unpack<message_t>(message);
    failed_message.success = false;
    auto packed_data = eosio::pack(failed_message);
    return packed_data;
  } 

  void receipt_received(const std::vector<char>& receipt) {  
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
      
    eosio::check(receipt.size(), "no receipt data received");
    auto receipt_received = eosio::unpack<message_t>(receipt);
    std::string memo = "LiquidApps LiquidLink Transfer Failed - Refund Processed";
    
    if (!receipt_received.success) {
      // return locked tokens in case of failure
      if (settings.can_issue) {
        action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
          std::make_tuple(_self, receipt_received.received_amount, memo))
        .send();
        action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
          std::make_tuple(_self, name(receipt_received.from_account), receipt_received.received_amount, memo))
        .send();
      } else {
        action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
          std::make_tuple(_self, name(receipt_received.from_account), receipt_received.received_amount, memo))
        .send();
      }
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

  // capture transfers to this contract
  void transfer(name from, name to, asset quantity, string memo) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    
    // validate proper transfer
    if (get_first_receiver() != settings.token_contract || from == _self) {
      return;
    }
    check(quantity.symbol == settings.token_symbol, "Incorrect symbol");
    check(quantity.amount >= settings.min_transfer, "Transferred amount is less than minimum required.");
    check(settings.transfers_enabled, "transfers disabled");
    
    // to_account,to_chain is memo format
    vector<string> split_memo = split(memo, ",");
    message_t current_transfer = { true, from, split_memo[0], split_memo[1], quantity };

    auto data = eosio::pack(current_transfer);
    pushMessage(data);

    // burn tokens
    if (settings.can_issue) {
        action(permission_level{_self, "active"_n}, settings.token_contract, "retire"_n,
          std::make_tuple(quantity, std::string("burn tokens")))
        .send();
    }
  }

};//closure for CONTRACT_START
EOSIO_DISPATCH_SVC_TRX(CONTRACT_NAME(), (init)(enable)(disable))
