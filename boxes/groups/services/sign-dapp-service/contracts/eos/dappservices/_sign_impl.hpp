#pragma once
#include <eosio/eosio.hpp>

#define SIGN_DAPPSERVICE_SKIP_HELPER true

#define SIGN_DAPPSERVICE_ACTIONS_MORE() \
SVC_RESP_SIGN(signtrx)(name account, name permission, std::string client_code, checksum256 payload_hash, std::vector<char> signature, name current_provider){ \
} \
SVC_RESP_SIGN(sgcleanup)(name account, name permission, std::string client_code, checksum256 payload_hash, std::vector<char> signature, name current_provider){ \
} 
