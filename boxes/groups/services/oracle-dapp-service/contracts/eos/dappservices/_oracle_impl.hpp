#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/transaction.hpp>
#include "../Common/base/base64.hpp"
using std::vector;
using namespace eosio;

const checksum256 hashData(vector<char> data){ 
    auto buffer = data; 
    char* c = (char*) malloc(buffer.size()+1); 
    memcpy(c, buffer.data(), buffer.size()); 
    c[buffer.size()] = 0; 
    capi_checksum256 *hash_val = (capi_checksum256 *) malloc(32); 
    sha256(c, buffer.size(), hash_val); 
    char * placeholder = (char*) malloc(32);
    memcpy(placeholder , hash_val, 32 );
    std::vector<char> hash_ret = std::vector<char>(placeholder,placeholder + 32); 
    uint64_t * p64 = (uint64_t*) malloc(32);
    memcpy(p64 , hash_ret.data(), 32 );
    return checksum256::make_from_word_sequence<uint64_t>(p64[0], p64[1], p64[2], p64[3]);
} 

struct provider_result {
    std::vector<char> result;
    name provider;
};
TABLE oracleentry {  
   uint64_t                         id; 
   std::vector<char>                uri;
   std::vector<provider_result>     results;
   checksum256 hash_key() const { return hashData(uri); }  
   uint64_t primary_key()const { return id; }  
};  

typedef eosio::multi_index<"oracleentry"_n, oracleentry, indexed_by<"byhash"_n, const_mem_fun<oracleentry, checksum256, &oracleentry::hash_key>>> oracleentries_t; 

#define ORACLE_DAPPSERVICE_ACTIONS_MORE() \
TABLE oracleentry {  \
   uint64_t                      id; \
   std::vector<char>             uri; \
   std::vector<provider_result>     results; \
   checksum256 hash_key() const { return hashData(uri); }  \
   uint64_t primary_key()const { return id; }  \
};  \
typedef eosio::multi_index<"oracleentry"_n, oracleentry, indexed_by<"byhash"_n, const_mem_fun<oracleentry, checksum256, &oracleentry::hash_key>>> oracleentries_t; \
template<typename Lambda> \
static std::vector<char> _extractResults(const oracleentry& existing, Lambda&& combinator){  \
    return combinator(existing.results); \
} \
static checksum256 transaction_id() { \
   using namespace eosio; \
   checksum256 h; \
   auto size = transaction_size(); \
   char buf[size]; \
   uint32_t read = read_transaction( buf, size ); \
   check( size == read, "read_transaction failed"); \
   return sha256(buf, read); \
} \
template<typename Lambda> \
static std::vector<char> getURI(std::vector<char> uri, Lambda&& combinator){  \
    checksum256 trxId = transaction_id(); \
    auto trxIdp = trxId.data(); \
    std::string trxIdStr(trxIdp, trxIdp + trxId.size()); \
    auto pubTime = tapos_block_prefix(); \
    std::string uristr(uri.begin(), uri.end()); \
    auto s = fc::base64_encode(trxIdStr) + "://" + fc::to_string(pubTime) + "://" + uristr;\
    std::vector<char> idUri(s.begin(), s.end()); \
    return _getURI(idUri, combinator); \
}\
template<typename Lambda> \
static std::vector<char> _getURI(std::vector<char> uri, Lambda&& combinator){  \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashData(uri)); \
    if(existing == cidx.end()){  \
        SEND_SVC_REQUEST(geturi, uri); \
    } \
    else {\
        auto results = _extractResults(*existing, combinator);\
        cidx.erase(existing);\
        return results; \
    } \
    return std::vector<char>();\
}  \
static void updateOracleResult(std::vector<char> uri, name provider, std::vector<char> result){  \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashData(uri)); \
    provider_result new_result;\
    new_result.provider = provider;\
    new_result.result = result;\
    if(existing != cidx.end())\
        cidx.modify(existing,_self, [&]( auto& a ) {  \
                    a.results.emplace_back(new_result);\
        }); \
    else entries.emplace(_self, [&]( auto& a ) {  \
                a.id = entries.available_primary_key();  \
                a.uri = uri;  \
                a.results.emplace_back(new_result);\
    }); \
}  \
SVC_RESP_ORACLE(geturi)(uint32_t size,std::vector<char> uri,std::vector<char> data, name current_provider){ \
    updateOracleResult(uri, current_provider, data); \
} \
SVC_RESP_ORACLE(orcclean)(uint32_t size, std::vector<char> uri, name current_provider){ \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashData(uri)); \
    if(existing != cidx.end()) cidx.erase(existing); \
} 