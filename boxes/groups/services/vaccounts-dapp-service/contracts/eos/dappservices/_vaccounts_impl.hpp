#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/action.hpp>
#define VACCOUNTS_DAPPSERVICE_SKIP_HELPER true
#define VACCOUNTS_DAPPSERVICE_SERVICE_MORE \
  void execute_vaccounts_action(action act){\
      print("should never get here");\
  }
  
void verify_signature(std::vector<char> payload, const eosio::signature& sig, const eosio::public_key& pubkey){ 
    auto digest = sha256( payload.data(), payload.size() ); 
    eosio::assert_recover_key( digest, sig, pubkey); 
} 
#define VACCOUNTS_DAPPSERVICE_ACTIONS_MORE() \
eosio::public_key _pubkey;\
eosio::public_key get_current_public_key(){ \
    return _pubkey; \
} \
void required_key(const eosio::public_key& pubkey){ \
    eosio::check(_pubkey == pubkey, "wrong public key"); \
} \
void unpack_exec_action(std::vector<char> payload){ \
    eosio::action res = eosio::unpack<eosio::action>( payload.data(), payload.size() ); \
    execute_vaccounts_action(res);  \
} \
SVC_RESP_VACCOUNTS(vexec)(std::vector<char> payload, eosio::signature sig, eosio::public_key pubkey, name current_provider){ \
    verify_signature(payload, sig, pubkey); \
    _pubkey = pubkey;\
    unpack_exec_action(payload); \
}