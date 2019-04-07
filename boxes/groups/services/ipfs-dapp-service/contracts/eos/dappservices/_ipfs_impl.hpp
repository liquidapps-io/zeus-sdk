#pragma once
#include "../Common/base/base58.hpp"
#include <string>
#include <vector>
#include <eosiolib/eosio.hpp>
#include <eosiolib/crypto.h>
using std::vector;
using ipfsmultihash_t = std::vector<char>; 

#ifndef DAPP_RAM_PAYER
#define DAPP_RAM_PAYER _self
#endif

const std::vector<char> hashData(vector<char> data){ 
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
    std::vector<char> hash = hashData(data); 
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
    eosio_assert(is_equal(calcedhash,hash),"hashes not equel");
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
    uint64_t * p64 = (uint64_t*) malloc(32);
    memcpy(p64 , ipfshash.data(), 32 );

    // std::vector<char> multiHashPart(ipfshash.begin() + 4, ipfshash.end());
    // const uint64_t *p64 = reinterpret_cast<const uint64_t *>(&ipfshash);
    return checksum256::make_from_word_sequence<uint64_t>(p64[0], p64[1], p64[2], p64[3]);
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
   uint64_t primary_key()const { return id; }  
   checksum256 hash_key()const { return uri_to_key256(data_to_uri(data)); }  
};  
typedef eosio::multi_index<"ipfsentry"_n, ipfsentry, 
      indexed_by<"byhash"_n, 
      const_mem_fun<ipfsentry, checksum256, 
                               &ipfsentry::hash_key> 
                >> ipfsentries_t; 
#define IPFS_DAPPSERVICE_ACTIONS_MORE() \
TABLE ipfsentry {  \
   uint64_t                      id; \
   std::vector<char>             data; \
   uint64_t primary_key()const { return id; }  \
   checksum256 hash_key()const { return uri_to_key256(data_to_uri(data)); }  \
};  \
typedef eosio::multi_index<"ipfsentry"_n, ipfsentry, \
      indexed_by<"byhash"_n, \
                 const_mem_fun<ipfsentry, checksum256, \
                               &ipfsentry::hash_key> \
                >> ipfsentries_t; \
static std::vector<char> getRawData(std::string uri, bool pin = false){  \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing == cidx.end())  \
        svc_ipfs_warmup(uri); \
    else if(!pin)\
        svc_ipfs_commit(existing->data); \
    return existing->data;  \
}  \
static std::string setRawData(std::vector<char> data, bool pin = false){  \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto currentUri = data_to_uri(data); \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(currentUri)); \
    if(existing == cidx.end()){  \
        entries.emplace(_self, [&]( auto& a ) {  \
                    a.id = entries.available_primary_key();  \
                    a.data = data;  \
        }); \
        if(!pin) svc_ipfs_commit(data);  \
    } \
    return currentUri; \
}\
template<typename T>  \
static T getData(std::string uri, bool pin = false){  \
    return eosio::unpack<T>(getRawData(uri, pin)); \
}  \
template<typename T>  \
static std::string setData(T  obj, bool pin = false){  \
    return setRawData(eosio::pack<T>(obj), pin);  \
}   \
SVC_RESP_IPFS(warmup)(uint32_t size,std::string uri,std::vector<char> data, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto currentUri = data_to_uri(data); \
    eosio_assert(currentUri == uri, "wrong uri"); \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing != cidx.end()) return; \
    entries.emplace(DAPP_RAM_PAYER, [&]( auto& a ) {  \
                a.id = entries.available_primary_key();  \
                a.data = data;  \
    }); \
} \
SVC_RESP_IPFS(cleanup)(uint32_t size, std::string uri, name current_provider){ \
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing != cidx.end()) cidx.erase(existing); \
} \
SVC_RESP_IPFS(commit)(uint32_t size,std::string uri, name current_provider){\
    auto _self = name(current_receiver()); \
    ipfsentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(uri_to_key256(uri)); \
    if(existing != cidx.end()) cidx.erase(existing); \
} 