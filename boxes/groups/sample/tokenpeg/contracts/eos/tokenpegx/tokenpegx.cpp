
#define LIQUIDX
#include "../dappservices/link.hpp"
#define CONTRACT_NAME() tokenpegx

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) transfer_received(message);

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) transfer_receipt(receipt);

CONTRACT_START()

  LINK_BOOTSTRAP()

  struct transfer_t {
    name from_account;
    string to_account;
    string to_chain;
    asset received_amount;
  };

  TABLE token_settings_t {
    name token_contract;
    symbol token_symbol;
    bool transfers_enabled;
    bool can_issue; // true if token is being bridged to this chain, else false 
  };
  typedef eosio::singleton<"config"_n, token_settings_t> token_settings_table;
  typedef eosio::multi_index<"config"_n, token_settings_t> token_settings_table_abi;

  [[eosio::action]]
  void init(
    name sister_code,
    string sister_chain_name,
    string this_chain_name,
    bool processing_enabled,
    name token_contract,
    symbol token_symbol,
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
      settings.token_symbol = token_symbol;
      settings.transfers_enabled = transfers_enabled;
      settings.can_issue = can_issue;
      settings_singleton.set(settings, _self);
      //Add additional init logic as neccessary
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
      //Add additional enabling logic as neccessary
  }

  vector<char> transfer_received(message_payload message) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
      
    auto transfer_data = eosio::unpack<transfer_t>(message.data);
    
    if (settings.can_issue) {
      action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
        std::make_tuple(name(transfer_data.to_account), transfer_data.received_amount, string("")))
      .send();
    } else {
      action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
        std::make_tuple(_self, name(transfer_data.to_account), transfer_data.received_amount, string("")))
      .send();
    }
    return vector<char>();
  } 

  void transfer_receipt(message_receipt receipt) {  
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
      
    auto transfer_receipt = eosio::unpack<transfer_t>(receipt.data);
    
    //failures are not yet handled - will always be success
    if (!receipt.success) {
      // return locked tokens in case of failure
      if (settings.can_issue) {
        action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
          std::make_tuple(name(transfer_receipt.to_account), transfer_receipt.received_amount, ""))
        .send();
      } else {
        action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
          std::make_tuple(_self, name(transfer_receipt.to_account), transfer_receipt.received_amount, ""))
        .send();
      }
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

  void transfer(name from, name to, asset quantity, string memo) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
    
    // validate proper transfer
    if (get_first_receiver() != settings.token_contract || from == _self) {
      return;
    }
    check(quantity.symbol == settings.token_symbol, "Incorrect symbol");
    check(settings.transfers_enabled, "transfers disabled");
    
    // to_account,to_chain is memo format
    vector<string> split_memo = split(memo, ",");
    transfer_t current_transfer = { from, split_memo[0], split_memo[1], quantity };

    auto data = eosio::pack<transfer_t>(current_transfer);
    pushMessage(data);
  }

};//closure for CONTRACT_START
EOSIO_DISPATCH_SVC_TRX(CONTRACT_NAME(), (init)(enable))
