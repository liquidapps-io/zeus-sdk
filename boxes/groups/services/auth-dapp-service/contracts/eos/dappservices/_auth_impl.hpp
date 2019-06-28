#pragma once
#include <eosio/eosio.hpp>
#include <eosio/action.hpp>

#define AUTH_DAPPSERVICE_SKIP_HELPER true
#define AUTH_DAPPSERVICE_SERVICE_MORE \
 bool allow_usage(name permission, name account, std::string client_code, checksum256 payload_hash, std::vector<char> signature, name current_provider){ \
      print("should never get here");\
      return false; \
 }
  
#define AUTH_DAPPSERVICE_ACTIONS_MORE() \
SVC_RESP_AUTH(authusage)(name account, name permission, std::string client_code, checksum256 payload_hash, std::vector<char> signature, name current_provider){ \
    auto authed = allow_usage(account, permission, client_code, payload_hash, signature, current_provider); \
    eosio::check(false, authed ? "afn:true" : "afn:false"); \
} 
