#define LINK_PROTOCOL_ETHEREUM true
#include "../dappservices/link.hpp"
#define CONTRACT_NAME() ethtokenpeg

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) message_received(message);

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) receipt_received(receipt);

CONTRACT_START()

  LINK_BOOTSTRAP()

  struct message {
    eosio::name account;            
    int64_t amount;
    std::string address;
  };

  std::string pad_left(std::string data) {
    std::string s(64 - data.size(), '0');
    return s.append(data);
  }

  std::string clean_eth_address(std::string address) {
    // remove initial 0x if there
    if (address[1] == 'x') {
        return address.substr(2);
    }
    return address;
  }

  std::vector<char> HexToBytes(const std::string& hex) {
    std::vector<char> bytes;
    for (unsigned int i = 0; i < hex.length(); i += 2) {
        std::string byteString = hex.substr(i, 2);
        char byte = (char) strtol(byteString.c_str(), NULL, 16);
        bytes.push_back(byte);
    }
    return bytes;
  }

  std::string BytesToHex(vector<char> data)
  {
    std::string s(data.size() * 2, ' ');
    char hexmap[] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};
    for (int i = 0; i < data.size(); ++i) {
        s[2 * i]     = hexmap[(data[i] & 0xF0) >> 4];
        s[2 * i + 1] = hexmap[data[i] & 0x0F];
    }
    return s;
  }

  message unpack(vector<char> data) {
    vector<char> account_v(32);
    vector<char> amount_v(8);
    vector<char> address_v(20);

    memcpy(account_v.data(), data.data(), account_v.size());
    memcpy(amount_v.data(), &data[32+24], amount_v.size());
    memcpy(address_v.data(), &data[96-address_v.size()], address_v.size());

    string account_s = string(account_v.data());
    name account = name(account_s);
    
    int64_t amount;   
    vector<char> amount_vr(8);                     
    std::reverse_copy(&amount_v[0], &amount_v[8], amount_vr.data());
    memcpy(&amount, amount_vr.data(), amount_vr.size());

    string address = BytesToHex(address_v);
    return message{ account, amount, "0x" + address };
  }

  vector<char> pack(message data) {
    vector<char> account;
    account.resize(32);
    auto account_s = data.account.to_string();
    auto account_c = account_s.c_str();            
    memcpy(&account[0], account_c, account_s.length());

    int64_t amount_i = data.amount;
    vector<char> amount_v;
    vector<char> amount;
    amount_v.resize(sizeof(int64_t));
    amount.resize(32);
    memcpy(amount_v.data(), &amount_i, amount_v.size());
    std::reverse_copy(&amount_v[0], &amount_v[8], &amount[24]);

    auto address = HexToBytes(pad_left(clean_eth_address(data.address)));

    vector<char> payload;
    payload.resize(96);

    memcpy(&payload[0], account.data(), account.size());
    memcpy(&payload[32], amount.data(), amount.size());
    memcpy(&payload[96-address.size()], address.data(), address.size());

    return payload;
  }

  TABLE token_settings_t {
    name token_contract;
    symbol token_symbol;
    uint64_t min_transfer;
    bool transfers_enabled;
    bool can_issue; // true if token is being bridged to this chain, else false 
  };
  typedef eosio::singleton<"config"_n, token_settings_t> token_settings_table;
  typedef eosio::multi_index<"config"_n, token_settings_t> token_settings_table_abi;

  [[eosio::action]]
  void init(
    string sister_address,
    string sister_msig_address,
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
      settings.token_symbol = token_symbol;
      settings.min_transfer = min_transfer;
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
    
    // the memo should contain ONLY the eth address.
    message new_transfer = { from, quantity.amount, memo };
    pushMessage(pack(new_transfer));
  }

  vector<char> message_received(message_payload message) {
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
      
    auto transfer_data = unpack(message.data);
    std::string memo = "LiquidApps LiquidLink Transfer - Received from Ethereum account " + transfer_data.address;

    //TODO: We should check for things like destination account exists, funds are available, a token account exists, etc
    // and then we should be able to return that the message is a failure if those conditions don't pass
    asset quantity = asset(transfer_data.amount, settings.token_symbol);
    
    if (settings.can_issue) {
      action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
        std::make_tuple(name(transfer_data.account), quantity, memo))
      .send();
    } else {
      action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
        std::make_tuple(_self, name(transfer_data.account), quantity, memo))
      .send();
    }
    return vector<char>();
  } 

  void receipt_received(message_receipt receipt) {
    // deserialize original message to get the quantity and original sender to refund
    token_settings_table settings_singleton(_self, _self.value);
    token_settings_t settings = settings_singleton.get_or_default();
      
    auto transfer_receipt = unpack(receipt.data);
    std::string memo = "LiquidApps LiquidLink Transfer Failed - Attempted to send to Ethereum account " + transfer_receipt.address;

    asset quantity = asset(transfer_receipt.amount, settings.token_symbol);

    if (!receipt.success) {
      // return locked tokens in case of failure
      if (settings.can_issue) {
        action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
          std::make_tuple(name(transfer_receipt.account), quantity, memo))
        .send();
      } else {
        action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
          std::make_tuple(_self, name(transfer_receipt.account), quantity, memo))
        .send();
      }
    } else {
      //TODO: should we burn the tokens or send them to a "holding account"
    }
  }

};//closure for CONTRACT_START
EOSIO_DISPATCH_SVC_TRX(CONTRACT_NAME(), (init)(enable))
