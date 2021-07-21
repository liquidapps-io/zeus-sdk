#pragma once
#include "../Common/base/base58.hpp"
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/transaction.hpp>
#include <eosio/crypto.hpp>
#include <eosio/binary_extension.hpp>
using std::vector;
using ipfsmultihash_t = std::vector<char>; 

#ifndef DAPP_RAM_PAYER
#define DAPP_RAM_PAYER _self
#endif

const std::vector<char> hashDataV(vector<char> data){ 
  auto buffer = data; 
  char* c = (char*) malloc(buffer.size()+1); 
  memcpy(c, buffer.data(), buffer.size()); 
  c[buffer.size()] = 0; 
  capi_checksum256 *hash_val = (capi_checksum256 *) malloc(32); 
  sha256(c, buffer.size(), hash_val); 
  char * placeholder = (char*) malloc(32);
  memcpy(placeholder , hash_val, 32 );
  std::vector<char> hash_ret = std::vector<char>(placeholder,placeholder + 32); 
  return hash_ret; 
} 
static ipfsmultihash_t data_to_ipfsmultihash(std::vector<char> data) { 
    // fn - 0x12  
    // size - 0x20  
    // hash - 32 
    ipfsmultihash_t res; 
    res.push_back(0x01);
    res.push_back(0x55);
    res.push_back(0x12);
    res.push_back(0x20);
    std::vector<char> hash = hashDataV(data); 
    auto it = hash.begin(); 
    while (it != hash.end()) 
        res.push_back(*(it++)); 
    return res; 
} 
static bool is_equal(ipfsmultihash_t &a,ipfsmultihash_t &b){  
    return memcmp((void *)&a, (const void *)&b, a.size()) == 0; 
} 
static void assert_ipfsmultihash(std::vector<char> data, ipfsmultihash_t hash) {
    ipfsmultihash_t calcedhash = data_to_ipfsmultihash(data);
    eosio::check(is_equal(calcedhash,hash),"hashes not equel");
}

static std::string ipfsmultihash_to_uri(ipfsmultihash_t ipfshash) {
    std::string prefix = "ipfs://z";
    auto encoded = base58_encode(ipfshash);
    string str(encoded.begin(),encoded.end());
    return (prefix + str).c_str();
}

static ipfsmultihash_t uri_to_ipfsmultihash(std::string uri) {
    // read after "ipfs://z"
    std::vector<char> multiHashPart(uri.begin() + 8, uri.end());
    return base58_decode(multiHashPart);
}

static eosio::checksum256 ipfsmultihash_to_key256(ipfsmultihash_t ipfshash) {
    // skip 4 bytes 
    std::vector<char> multiHashPart(ipfshash.begin() + 4, ipfshash.end());
    uint64_t * p64 = (uint64_t*) malloc(32);
    memcpy(p64 , multiHashPart.data(), 32 );

    // const uint64_t *p64 = reinterpret_cast<const uint64_t *>(&ipfshash);
    return checksum256::make_from_word_sequence<uint64_t>(p64[0], p64[1], p64[2], p64[3]);
}
static uint64_t short_hash(checksum256 &hash_val){
    uint64_t * p64a = (uint64_t*) malloc(32);
    memcpy(p64a, &hash_val, 32 );
    uint64_t res = *(p64a+3);
    return res;
}
static eosio::checksum256 uri_to_key256(std::string uri) {
    auto ipfsHash = uri_to_ipfsmultihash(uri);
    return ipfsmultihash_to_key256(ipfsHash);
}

static std::string data_to_uri(std::vector<char> data) {
    return ipfsmultihash_to_uri(data_to_ipfsmultihash(data));
}
TABLE ipfsentry {  
   uint64_t                      id; 
   std::vector<char>             data; 
   binary_extension<bool>        pending_commit;
   uint64_t primary_key()const { return id; }  
   checksum256 hash_key()const { return uri_to_key256(data_to_uri(data)); }  
};  
typedef eosio::multi_index<"ipfsentry"_n, ipfsentry, 
      indexed_by<"byhash"_n, 
      const_mem_fun<ipfsentry, checksum256, 
                               &ipfsentry::hash_key> 
                >> ipfsentries_t; 

TABLE ipfsremote {  
    uint64_t                      id;
    uint32_t                      shard;
    name                          code;
    name                          table;
    name                          chain;
    std::vector<char>             data; 
    uint64_t primary_key()const { return id; }  
    checksum256 by_remote() const {
        return _by_remote(shard, code, table, chain);
    }
    static checksum256 _by_remote(uint32_t shard, name code, name table, name chain) {
      return checksum256::make_from_word_sequence<uint64_t>(shard, code.value, table.value, chain.value);
    }
    checksum256 hash_key()const { return uri_to_key256(data_to_uri(data)); }  
};  
typedef eosio::multi_index<"ipfsremote"_n, ipfsremote, 
      indexed_by<"byhash"_n, 
      const_mem_fun<ipfsremote, checksum256, 
                               &ipfsremote::hash_key>>, 
      indexed_by<"byremote"_n, 
      const_mem_fun<ipfsremote, checksum256, 
                               &ipfsremote::by_remote>>
                               > ipfsremotes_t;                 

#ifdef USE_ADVANCED_IPFS
#define IPFS_DAPPSERVICE_TABLES \
TABLE vmanifest { \
checksum256 next_available_key; \
uint32_t shards; \
uint32_t buckets_per_shard; \
std::map<uint64_t,std::vector<char>> shardbuckets; \
}; \
typedef eosio::multi_index<".vmanifest"_n, vmanifest> vmanifest_t_abi; \
TABLE vconfig { \
checksum256 next_available_key; \
uint32_t shards; \
uint32_t buckets_per_shard; \
uint32_t revision; \
};\
typedef eosio::multi_index<".vconfig"_n, vconfig> vconfig_t_abi;\
TABLE ipfsremote {  \
    uint64_t                      id;\
    uint32_t                      shard;\
    name                          code;\
    name                          table;\
    name                          chain;\
    std::vector<char>             data; \
    uint64_t primary_key()const { return id; }  \
    checksum256 by_remote() const {\
        return _by_remote(shard, code, table, chain);\
    }\
    static checksum256 _by_remote(uint32_t shard, name code, name table, name chain) {\
      return checksum256::make_from_word_sequence<uint64_t>(shard, code.value, table.value, chain.value);\
    }\
    checksum256 hash_key()const { return uri_to_key256(data_to_uri(data)); }  \
};  \
typedef eosio::multi_index<"ipfsremote"_n, ipfsremote, \
      indexed_by<"byhash"_n, \
      const_mem_fun<ipfsremote, checksum256, \
                               &ipfsremote::hash_key>>, \
      indexed_by<"byremote"_n, \
      const_mem_fun<ipfsremote, checksum256, \
                               &ipfsremote::by_remote>>\
                               > ipfsremotes_t;
#else
#define IPFS_DAPPSERVICE_TABLES \
TABLE vconfig { \
uint64_t next_available_key; \
uint32_t shards; \
uint32_t buckets_per_shard; \
};\
typedef eosio::multi_index<".vconfig"_n, vconfig> vconfig_t_abi;
#endif
                
#define IPFS_DAPPSERVICE_ACTIONS_MORE() \
IPFS_DAPPSERVICE_TABLES \
TABLE ipfsentry {  \
   uint64_t                      id; \
   std::vector<char>             data; \
   binary_extension<bool>        pending_commit;\
   uint64_t primary_key()const { return id; }  \
   checksum256 hash_key()const { return uri_to_key256(data_to_uri(data)); }  \
};  \
typedef eosio::multi_index<"ipfsentry"_n, ipfsentry, \
      indexed_by<"byhash"_n, \
                 const_mem_fun<ipfsentry, checksum256, \
                               &ipfsentry::hash_key> \
                >> ipfsentries_t; \
static void defer_commit(std::vector<char> data, uint64_t key, uint32_t delay_sec)\
{ \
    auto _self = name(current_receiver()); \
    if(delay_sec == 0){ \
        svc_ipfs_commit(data); \
        return; \
    } \
    transaction tx; \
    tx.actions.emplace_back( \
                            permission_level{_self, "active"_n}, \
                            _self, "xdcommit"_n, \
                            std::make_tuple(data) \
                            ); \
    tx.delay_sec = delay_sec; \
    cancel_deferred(key); \
    tx.send(key, _self); \
} \
static std::vector<char> getRawData(std::string uri, bool pin = false, bool skip_commit = false, uint32_t delay_sec = 0, name code = current_receiver()){  \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto key =  uri_to_key256(uri); \
    auto existing = cidx.find(key); \
    if(existing == cidx.end()) {\
        if(_self != code) {\
            ipfsentries_t r_entries(code, code.value);  \
            auto r_cidx = r_entries.get_index<"byhash"_n>(); \
            auto r_existing = r_cidx.find(key); \
            if(r_existing != r_cidx.end()) return r_existing->data;\
            svc_ipfs_warmupcode(uri,code); \
        }\
        svc_ipfs_warmup(uri); \
    } \
    auto data = existing->data;\
    if(skip_commit){ \
        cidx.erase(existing); \
    } else if(!pin && !existing->pending_commit.value_or()) {\
        entries.modify(*existing, eosio::same_payer, [&]( auto& a ) {  \
            a.pending_commit.emplace(true); \
        }); \
        defer_commit(existing->data, short_hash(key), delay_sec); \
    }\
    return data;  \
}  \
static std::vector<char> getRawTreeData(std::string uri, name code, name table, uint64_t scope, uint8_t index_position, checksum256 castedKey, uint8_t keySize, bool pin = false, bool skip_commit = false, uint32_t delay_sec = 0){  \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto key =  uri_to_key256(uri); \
    auto existing = cidx.find(key); \
    if(existing == cidx.end()) {  \
        if(_self != code) {\
            ipfsentries_t r_entries(code, code.value);  \
            auto r_cidx = r_entries.get_index<"byhash"_n>(); \
            auto r_existing = r_cidx.find(key); \
            if(r_existing != r_cidx.end()) return r_existing->data;\
        }\
        svc_ipfs_warmuprow(uri, code, table, scope, index_position, castedKey, keySize); \
    } \
    auto data = existing->data;\
    if(skip_commit){ \
        cidx.erase(existing); \
    }\
    else if(!pin)\
        defer_commit(existing->data, short_hash(key), delay_sec); \
    return data;  \
}  \
static std::vector<char> getRawCrosschainTreeData(uint32_t shard, name code, name table, name chain, uint64_t scope, uint8_t index_position, checksum256 castedKey, uint8_t keySize){  \
    auto _self = name(current_receiver()); \
    ipfsremotes_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byremote"_n>(); \
    auto key =  ipfsremote::_by_remote(shard,code,table,chain); \
    auto existing = cidx.find(key); \
    if(existing == cidx.end()) {  \
        svc_ipfs_warmupchain(shard, code, table, chain, scope, index_position, castedKey, keySize); \
    }\
    auto data = existing->data;\
    cidx.erase(existing);\
    return data; \
}  \
static std::string setRawData(std::vector<char> data, bool pin = false, uint32_t delay_sec = 0){  \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto currentUri = data_to_uri(data); \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto key = uri_to_key256(currentUri); \
    auto existing = cidx.find(key); \
    uint64_t id = 0;  \
    bool pending_commit = false; \
    if(existing == cidx.end()){  \
        entries.emplace(_self, [&]( auto& a ) {  \
                    a.id = entries.available_primary_key();  \
                    id = a.id; \
                    a.pending_commit.emplace(!pin); \
                    a.data = data;  \
        }); \
    } else {\
        id = existing->id;\
        pending_commit = existing->pending_commit.has_value() ? existing->pending_commit.value() : false;\
    } \
    if(!pin && !pending_commit) {\
        defer_commit(data, short_hash(key), delay_sec); \
    }\
    return currentUri; \
}\
template<typename T>  \
static T getData(std::string uri, bool pin = false, bool skip_commit = false, uint32_t delay_sec = 0, name code = current_receiver()){  \
    return eosio::unpack<T>(getRawData(uri, pin, skip_commit, delay_sec, code)); \
}  \
template<typename T>  \
static T getTreeData(std::string uri, name code, name table, uint64_t scope, uint8_t index_position, checksum256 castedKey, uint8_t keySize, bool pin = false, bool skip_commit = false, uint32_t delay_sec = 0){  \
    return eosio::unpack<T>(getRawTreeData(uri, code, table, scope, index_position, castedKey, keySize, pin, skip_commit, delay_sec)); \
}  \
template<typename T>  \
static T getCrosschainTreeData(uint32_t shard, name code, name table, name chain, uint64_t scope, uint8_t index_position, checksum256 castedKey, uint8_t keySize){  \
    return eosio::unpack<T>(getRawCrosschainTreeData(shard, code, table, chain, scope, index_position, castedKey, keySize)); \
}  \
template<typename T>  \
static std::string setData(T  obj, bool pin = false, uint32_t delay_sec = 0){  \
    return setRawData(eosio::pack<T>(obj), pin, delay_sec);  \
}   \
static void applyWarmup(uint32_t size,std::string uri,std::vector<char> data, name current_provider){\
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto currentUri = data_to_uri(data); \
    eosio::check(currentUri == uri, "wrong uri"); \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing != cidx.end()) return; \
    entries.emplace(DAPP_RAM_PAYER, [&]( auto& a ) {  \
                a.id = entries.available_primary_key();  \
                a.data = data;  \
                a.pending_commit.emplace(false);\
    }); \
}\
SVC_RESP_IPFS(warmup)(uint32_t size,std::string uri,std::vector<char> data, name current_provider){ \
    applyWarmup(size,uri,data,current_provider);\
} \
SVC_RESP_IPFS(warmupcode)(uint32_t size,std::string uri,std::vector<char> data, name current_provider){ \
    applyWarmup(size,uri,data,current_provider);\
} \
SVC_RESP_IPFS(cleanup)(uint32_t size, std::string uri, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing != cidx.end()) cidx.erase(existing); \
} \
SVC_RESP_IPFS(warmuprow)(uint32_t size, std::vector<std::string> uris, std::vector<std::vector<char>> data, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    for (auto i = 0; i < data.size(); i++) { \
        auto currentData = data[i]; \
        auto currentUri = data_to_uri(currentData); \
        eosio::check(currentUri == uris[i], "wrong uri"); \
        auto cidx = entries.get_index<"byhash"_n>(); \
        auto existing = cidx.find(uri_to_key256(currentUri)); \
        if(existing != cidx.end()) continue; \
        entries.emplace(DAPP_RAM_PAYER, [&]( auto& a ) {  \
                    a.id = entries.available_primary_key();  \
                    a.data = currentData;  \
        }); \
    } \
} \
SVC_RESP_IPFS(warmupchain)(uint32_t shard, name code, name table, name chain, uint32_t size, std::vector<std::string> uris, std::vector<std::vector<char>> data, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsremotes_t shards(_self, _self.value);  \
    auto shardCidx = shards.get_index<"byremote"_n>(); \
    auto key = ipfsremote::_by_remote(shard,code,table,chain); \
    auto existingShard = shardCidx.find(key); \
    auto shardData = data[0]; \
    if(existingShard == shardCidx.end()) {\
        shards.emplace(DAPP_RAM_PAYER, [&]( auto& a ) {  \
            a.id = shards.available_primary_key();  \
            a.shard = shard;\
            a.code = code;\
            a.table = table;\
            a.chain = chain;\
            a.data = shardData;\
        }); \
    } else {\
        shardCidx.modify(existingShard, eosio::same_payer, [&](auto& a) {\
            a.data = shardData;\
        });\
    }\
    ipfsentries_t entries(_self, _self.value);  \
    for (auto i = 1; i < data.size(); i++) { \
        auto currentData = data[i]; \
        auto currentUri = data_to_uri(currentData); \
        eosio::check(currentUri == uris[i], "wrong uri"); \
        auto cidx = entries.get_index<"byhash"_n>(); \
        auto existing = cidx.find(uri_to_key256(currentUri)); \
        if(existing != cidx.end()) continue; \
        entries.emplace(DAPP_RAM_PAYER, [&]( auto& a ) {  \
                    a.id = entries.available_primary_key();  \
                    a.data = currentData;  \
        }); \
    } \
} \
SVC_RESP_IPFS(cleanuprow)(uint32_t size, std::vector<std::string> uris, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    for (auto i = 0; i < uris.size(); i++) { \
        auto uri = uris[i]; \
        auto existing = cidx.find(uri_to_key256(uri)); \
        if(existing != cidx.end()) cidx.erase(existing); \
    } \
}  \
SVC_RESP_IPFS(cleanchain)(uint32_t shard, name code, name table, name chain, uint32_t size, std::vector<std::string> uris, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsremotes_t shards(_self, _self.value);  \
    auto shardCidx = shards.get_index<"byremote"_n>(); \
    auto key =  ipfsremote::_by_remote(shard,code,table,chain); \
    auto existingShard = shardCidx.find(key); \
    if(existingShard != shardCidx.end()) shardCidx.erase(existingShard); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    for (auto i = 0; i < uris.size(); i++) { \
        auto uri = uris[i]; \
        auto existing = cidx.find(uri_to_key256(uri)); \
        if(existing != cidx.end()) cidx.erase(existing); \
    } \
}  \
SVC_RESP_IPFS(commit)(uint32_t size,std::string uri, name current_provider){\
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing != cidx.end()) cidx.erase(existing); \
} \
[[eosio::action]] void xdcommit(std::vector<char> data){\
    require_auth(name(current_receiver())); \
    svc_ipfs_commit(data); \
}