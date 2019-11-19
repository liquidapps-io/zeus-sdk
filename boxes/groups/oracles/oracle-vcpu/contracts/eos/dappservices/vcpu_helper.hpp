#pragma once
#include "./oracle.hpp"
using std::vector;
using namespace eosio;



#define VCPUFUNC \
    [[eosio::action]] void
#define VCPUFN_RETURN(result) \
    { \
        auto packed = pack(result);\
        print(std::string("vrfn:") + fc::base64_encode(std::string(packed.data(),packed.data() + packed.size()))); \
    } while(0)
#define ORACLE_DAPPSERVICE_ACTIONS_VCPU() \
template<typename RES_T,typename Lambda> \
static RES_T call_vcpu_fn(name action, std::vector<char> payload, Lambda combinator){  \
    auto s = "vcpu://" + action.to_string() + "/" + fc::base64_encode(payload);\
    std::vector<char> idUri(s.begin(), s.end()); \
    auto res = getURI(idUri, combinator); \
    return unpack<RES_T>(res); \
}