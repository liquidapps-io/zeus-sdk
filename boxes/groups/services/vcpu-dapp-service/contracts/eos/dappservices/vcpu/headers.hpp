#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/transaction.hpp>
#include "../Common/base/base64.hpp"
using std::vector;
using namespace eosio;

const checksum256 hashDataVCPU(vector<char> data){
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
struct vcpu_provider_result {
    std::vector<char> result;
    name provider;
};
TABLE vcpuentry {
   uint64_t                         id;
   std::vector<char>                uri;
   std::vector<vcpu_provider_result>     results;
   checksum256 hash_key() const { return hashDataVCPU(uri); }
   uint64_t primary_key()const { return id; }
};

typedef eosio::multi_index<"vcpuentry"_n, vcpuentry, indexed_by<"byhash"_n, const_mem_fun<vcpuentry, checksum256, &vcpuentry::hash_key>>> vcpuentries_t;
static void updateVCPUResult(std::vector<char> uri, name provider, std::vector<char> result){  \
    auto _self = name(current_receiver());
    vcpuentries_t entries(_self, _self.value);
    auto cidx = entries.get_index<"byhash"_n>();
    auto existing = cidx.find(hashDataVCPU(uri));
    vcpu_provider_result new_result;
    new_result.provider = provider;
    new_result.result = result;
    if(existing != cidx.end())
        cidx.modify(existing,_self, [&]( auto& a ) {
                    a.results.emplace_back(new_result);
        }); \
    else entries.emplace(_self, [&]( auto& a ) {
                a.id = entries.available_primary_key();
                a.uri = uri;
                a.results.emplace_back(new_result);
    });
}


#define VCPUFUNC \
    [[eosio::action]] void
#define VCPUFN_RETURN(result) \
    { \
        auto packed = pack(result);\
        print(std::string("vrfn:") + fc::base64_encode(std::string(packed.data(),packed.data() + packed.size()))); \
    } while(0)
#define VCPU_DAPPSERVICE_ACTIONS_MORE() \
TABLE vcpuentry {  \
   uint64_t                      id; \
   std::vector<char>             uri; \
   std::vector<vcpu_provider_result>     results; \
   checksum256 hash_key() const { return hashDataVCPU(uri); }  \
   uint64_t primary_key()const { return id; }  \
};  \
typedef eosio::multi_index<"vcpuentry"_n, vcpuentry, indexed_by<"byhash"_n, const_mem_fun<vcpuentry, checksum256, &vcpuentry::hash_key>>> vcpuentries_t; \
template<typename Lambda> \
static std::vector<char> _vcpu_extractResults(const vcpuentry& existing, Lambda&& combinator){  \
    return combinator(existing.results); \
} \
static checksum256 vcpu_transaction_id() { \
   using namespace eosio; \
   checksum256 h; \
   auto size = transaction_size(); \
   char buf[size]; \
   uint32_t read = read_transaction( buf, size ); \
   check( size == read, "read_transaction failed"); \
   return sha256(buf, read); \
} \
template<typename Lambda> \
static std::vector<char> _call_vcpu_fn(std::vector<char> uri, std::vector<char> payload, Lambda&& combinator){  \
    auto _self = name(current_receiver()); \
    vcpuentries_t entries(_self, _self.value);  \
    auto cidx = entries.get_index<"byhash"_n>(); \
    auto existing = cidx.find(hashDataVCPU(uri)); \
    if(existing == cidx.end()){  \
        SEND_SVC_REQUEST(vrun, uri, payload); \
    } \
    else {\
        auto results = _vcpu_extractResults(*existing, combinator);\
        cidx.erase(existing);\
        return results; \
    } \
    return std::vector<char>();\
}  \
template<typename RES_T,typename Lambda> \
static RES_T call_vcpu_fn(name action, std::vector<char> payload, Lambda combinator){  \
    checksum256 trxId = vcpu_transaction_id(); \
    auto trxIdp = trxId.data(); \
    std::string trxIdStr(trxIdp, trxIdp + trxId.size()); \
    auto pubTime = tapos_block_prefix(); \
    auto hashed = hashDataVCPU(payload); \
    std::string str(hashed.data(), hashed.data() + hashed.size()); \
    auto s = fc::base64_encode(trxIdStr) + "://" + fc::to_string(pubTime) + "://" + action.to_string() + "://" + fc::base64_encode(str);\
    std::vector<char> idUri(s.begin(), s.end()); \
    auto res = _call_vcpu_fn(idUri, payload, combinator); \
    return unpack<RES_T>(res); \
}