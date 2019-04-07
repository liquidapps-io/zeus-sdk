#pragma once
#include <string>
#include <vector>
#include <eosiolib/eosio.hpp>
#include <eosiolib/crypto.h>
using std::vector;


const checksum256 hashData(vector<char> data){ 
    auto buffer = data; 
  //char *c = new char[buffer.size()+1]; 
    char* c = (char*) malloc(buffer.size()+1); 
    memcpy(c, buffer.data(), buffer.size()); 
    c[buffer.size()] = 0; 
    capi_checksum256 *hash_val = (capi_checksum256 *) malloc(32); 
    sha256(c, buffer.size(), hash_val); 
//   const int8_t *p32 = reinterpret_cast<const int8_t*>(&hash_val);
    char * placeholder = (char*) malloc(32);
    memcpy(placeholder , hash_val, 32 );
//   std::string str(s);
//   const char *p32 = reinterpret_cast<const char*>(&hash_val); 
    std::vector<char> hash_ret = std::vector<char>(placeholder,placeholder + 32); 
    uint64_t * p64 = (uint64_t*) malloc(32);
    memcpy(p64 , ipfshash.data(), 32 );
    
    // std::vector<char> multiHashPart(ipfshash.begin() + 4, ipfshash.end());
    // const uint64_t *p64 = reinterpret_cast<const uint64_t *>(&ipfshash);
    return checksum256::make_from_word_sequence<uint64_t>(p64[0], p64[1], p64[2], p64[3]);

    
} 

struct provider_result {
    std::vector<char> result;
    name provider;
}
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
   checksum256 hash_key() const { return hashData(uri); }  \
   uint64_t primary_key()const { return id; }  \
};  \
typedef eosio::multi_index<"oracleentry"_n, oracleentry, indexed_by<"byhash"_n, const_mem_fun<oracleentry, checksum256, &oracleentry::hash_key>>> oracleentries_t; \

template<typename Lambda> \
static std::vector<char> _extractResults(oracleentry& existing, Lambda&& combinator){  \
    std::vector<char> &tempRes = combinator(existing.results); \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    cidx.erase(existing); \
} \
static name _getNextProvider(oracleentry& existing, std::vector<name> providers){  \
    return providers[existing.results.size()].provider; \
} \
template<typename Lambda> \
static std::vector<char> _getURI(std::vector<char> uri, oracleentry& existing, std::vector<name> providers, Lambda&& combinator){  \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    if(existing == cidx.end()){  \
        name nextProvider = provider[0].provider; \
        svc_oracle_geturi(uri); \
    } \
    else {\
        if(existing.results.size() >= providers.size()){\
            return _extractResults(existing, combinator);\
        }\
        name nextProvider = _getNextProvider(provider); \
        SEND_SVC_REQUEST(geturi,nextProvider, uri); \
    } \
    return existing->data;  \
} \
template<typename Lambda> \
static std::vector<char> getURIFromProviders(std::vector<char> uri, std::vector<name> providers, Lambda&& combinator){  \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashData(uri)); \
    return _getURI(uri,existing, combinator); \
}  \
template<typename Lambda> \
static std::vector<char> getURI(std::vector<char> uri, Lambda&& combinator){  \
    auto providers = getProvidersForAccount(name(current_receiver()), SVC_CONTRACT_NAME_ORACLE); \
    return getURIFromProviders(uri, providers, combinator); \
}  \
static std::vector<char> updateOracleResult(std::vector<char> uri, name provider, std::vector<char> result){  \
    auto _self = name(current_receiver()); \
    oracleentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashData(uri)); \
    provider_result new_result;\
    new_result.provider = provider;\
    new_result.result = result;\
    if(existing != cidx.end())\
        entries.modify(existing,_self, [&]( auto& a ) {  \
                    a.data = data;  \
                    a.results.emplace_back(new_result);\
        }); \
    else entries.emplace(_self, [&]( auto& a ) {  \
                a.id = entries.available_primary_key();  \
                a.uri = uri;  \
                a.results.emplace_back(new_result);\
    }); \
}  \
SVC_RESP_ORACLE(geturi)(uint32_t size,std::vector<char> uri,std::vector<char> data){ \
    updateOracleResult(uri, provider, data); \
} \
