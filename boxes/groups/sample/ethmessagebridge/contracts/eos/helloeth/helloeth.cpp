#define LINK_PROTOCOL_ETHEREUM true
#include "../dappservices/link.hpp"

#define CONTRACT_NAME() helloeth

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) message_received(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) receipt_received(receipt)

CONTRACT_START()

LINK_BOOTSTRAP()

  [[eosio::action]]
  void init(
    string sister_address,
    string sister_msig_address,
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
          sister_address,
          sister_msig_address,
          sister_chain_name,
          this_chain_name,
          processing_enabled
      );
  }

  [[eosio::action]]
  void pushmsg(string message) {
    
  }

  vector<char> message_received(const std::vector<char>& message) {
    //string message_str(message.data.begin(), message.data.end());
    //eosio::print("Received message: " + message_str + "\n");
    return vector<char>();
  } 

  void receipt_received(const std::vector<char>& receipt) {
    return;
    //string response(receipt.data.begin(), receipt.data.end());
    //if (receipt.success) {
      //eosio::print("Success! Response: " + response + "\n");
    //} else {
      //eosio::print("Failure! Response: " + response + "\n");
    //}
  }

CONTRACT_END((init)(pushmsg))
