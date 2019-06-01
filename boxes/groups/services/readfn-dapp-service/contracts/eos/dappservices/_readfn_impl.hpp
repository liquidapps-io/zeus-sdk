#pragma once
#include <eosio/eosio.hpp>
#define READFN_DAPPSERVICE_ACTIONS_MORE()
#define READFN_RETURN(result) \
    eosio::check(false, std::string("rfn:") + result);
    
SVC_RESP_READFN(rfnuse)(uint32_t size, name current_provider){
}