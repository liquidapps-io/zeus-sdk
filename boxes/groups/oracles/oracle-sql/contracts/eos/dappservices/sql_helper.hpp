#pragma once
#include "./oracle.hpp"
using std::vector;
using namespace eosio;
#define ORACLE_DAPPSERVICE_ACTIONS_SQL() \
template<typename Lambda> \
static std::vector<std::vector<std::string>> call_sql(std::vector<char> query, Lambda combinator){  \
    checksum256 trxId = vcpu_transaction_id(); \
    auto s = "sql://" + query.to_string();\
    std::vector<char> idUri(s.begin(), s.end()); \
    auto res =  getURI(idUri, combinator); \
    return unpack<std::vector<std::vector<std::string>>>(res); \
}