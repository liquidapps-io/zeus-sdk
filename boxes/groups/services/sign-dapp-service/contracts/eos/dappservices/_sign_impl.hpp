#pragma once
#include <eosio/eosio.hpp>

#define SIGN_DAPPSERVICE_ACTIONS_MORE() \
SVC_RESP_SIGN(signtrx)(std::string id, std::string destination, std::string trx_data, std::string chain, std::string chain_type, std::string account, std::string trx_id, name current_provider){ \
} \
SVC_RESP_SIGN(sgcleanup)(uint64_t id, name current_provider){ \
} 