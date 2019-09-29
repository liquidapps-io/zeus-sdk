#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/action.hpp>
#include <eosio/singleton.hpp>
#include "./multi_index.hpp"
#include <boost/preprocessor/control/iif.hpp>
#include <boost/preprocessor/list/for_each.hpp>
#include <boost/preprocessor/seq/for_each.hpp>
#include <boost/preprocessor/seq/for_each_i.hpp>
#include <boost/preprocessor/seq/push_back.hpp>

#ifndef VACCOUNTS_DELAYED_CLEANUP
#define VACCOUNTS_DELAYED_CLEANUP 0
#endif

#ifndef VACCOUNTS_SHARD_PINNING
#define VACCOUNTS_SHARD_PINNING false
#endif


#define VACCOUNTS_DAPPSERVICE_SKIP_HELPER true
#define VACCOUNTS_DAPPSERVICE_SERVICE_MORE \
  void execute_vaccounts_action(action act){\
      print("should never get here");\
  }

void verify_signature(std::vector<char> payload, const eosio::signature& sig, const eosio::public_key& pubkey){
    auto digest = sha256( payload.data(), payload.size() );
    eosio::assert_recover_key( digest, sig, pubkey);
}

template<typename T>
struct dummy_wrapper {
      T payload;
};

#define VACCOUNTS_DAPPSERVICE_ACTIONS_MORE() \
eosio::public_key _pubkey;\
uint64_t _nonce;\
bool _verified = false; \
eosio::public_key get_current_public_key(){ \
    return _pubkey; \
} \
void required_key(const eosio::public_key& pubkey){ \
    eosio::check(_pubkey == pubkey, "wrong public key"); \
} \
struct unpacked_payload { \
  uint64_t expiry; \
  uint64_t nonce; \
  eosio::checksum256 chainid; \
  eosio::action action; \
}; \
unpacked_payload unpack_payload(std::vector<char> payload) { \
  eosio::check(payload.size() > 48, "header is required");\
  auto unpacked = eosio::unpack<unpacked_payload>( payload.data(), payload.size() ); \
  return unpacked; \
} \
void verify_chain(eosio::checksum256 chainid, uint64_t expiry) { \
  eosio::check(chainid == getChain(),"invalid chain id"); \
  eosio::check(current_time_point().sec_since_epoch() <= expiry, "transaction has expired"); \
} \
void unpack_exec_action(eosio::action res){ \
    switch(res.name.value){ \
      case name("regaccount").value: \
        regaccount(res.data_as<regaccount_action>()); \
        break; \
      default: \
        execute_vaccounts_action(res);  \
        break; \
    } \
} \
SVC_RESP_VACCOUNTS(vexec)(std::vector<char> payload, eosio::signature sig, eosio::public_key pubkey, name current_provider){ \
    verify_signature(payload, sig, pubkey); \
    auto unpacked = unpack_payload(payload); \
    verify_chain(unpacked.chainid, unpacked.expiry); \
    _nonce = unpacked.nonce; \
    _pubkey = pubkey;\
    unpack_exec_action(unpacked.action); \
} \
TABLE vchain { \
  eosio::checksum256 chainid; \
}; \
TABLE vkey { \
  eosio::public_key pubkey; \
  name vaccount; \
  uint64_t nonce; \
  uint64_t primary_key() const {return vaccount.value;} \
}; \
typedef eosio::singleton<"vchain"_n, vchain> vchain_t; \
typedef dapp::multi_index<"vkey"_n, vkey> vkeys_t; \
typedef eosio::multi_index<".vkey"_n,vkey> vkeys_t_v_abi;\
TABLE shardbucket_t {\
        std::vector<char> shard_uri;\
        uint64_t shard;\
        uint64_t primary_key() const { return shard; }\
};\
typedef eosio::multi_index<"vkey"_n, shardbucket_t> vkeys_t_abi;\
struct regaccount_action { \
  name vaccount; \
  EOSLIB_SERIALIZE( regaccount_action, (vaccount) ) \
}; \
[[eosio::action]] void regaccount(regaccount_action payload) { \
    print("setting key for:");\
    print(payload.vaccount);\
    print("\n");\
   setKey(payload.vaccount, get_current_public_key()); \
} \
[[eosio::action]] void xvinit(eosio::checksum256 chainid) { \
    require_auth(_self); \
    print("setting chainid:");\
    print(chainid);\
    print("\n");\
   setChain(chainid); \
} \
void require_vaccount(name vaccount){ \
    auto pkey = handleNonce(vaccount); \
    required_key(pkey); \
} \
void setKey(name vaccount, eosio::public_key pubkey){ \
    vkeys_t vkeys_table(_self, _self.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing == vkeys_table.end(),"vaccount already exists"); \
    vkeys_table.emplace(_self,[&]( auto& new_key ){ \
      new_key.pubkey = pubkey; \
      new_key.vaccount = vaccount;\
    }); \
} \
void setChain(eosio::checksum256 chainid){ \
    vchain_t vchain_table(_self, _self.value); \
    eosio::check(!vchain_table.exists(),"chain id has already been set"); \
    auto vchain = vchain_table.get_or_default(); \
    vchain.chainid = chainid; \
    vchain_table.set(vchain, _self); \
} \
eosio::public_key getKey(name vaccount){ \
    vkeys_t vkeys_table(_self, _self.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    return existing->pubkey; \
} \
eosio::public_key handleNonce(name vaccount){ \
    if(_verified) { return getKey(vaccount); } \
    vkeys_t vkeys_table(_self, _self.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    eosio::check(existing->nonce == _nonce,"invalid nonce"); \
    vkeys_table.modify(existing,_self,[&]( auto& v ){ \
      v.nonce++; \
    }); \
    _verified = true;\
    return existing->pubkey; \
} \
eosio::checksum256 getChain(){ \
    vchain_t vchain_table(_self, _self.value); \
    auto existing = vchain_table.get(); \
    return existing.chainid; \
}\




#define POPULATE_VACTION(r, dummy, field)                                           \
  case TONAME(BOOST_PP_SEQ_ELEM(1, field)).value: \
    { \
        auto payload_data = act.data_as<BOOST_PP_SEQ_ELEM(0, field)>(); \
        BOOST_PP_SEQ_ELEM(1, field)(payload_data); \
    } while(0); \
    break;

//hello(wrapper.payload[0]);

#define POPULATE_VACTION2(r, dummy, field) \
  BOOST_PP_SEQ_ELEM(1, field)

#define CONTRACT_ACTION_V_APPLY(VACTIONS) \
    BOOST_PP_SEQ_FOR_EACH(POPULATE_VACTION2, DUMMY_MACRO, VACTIONS)

#define VACCOUNTS_APPLY(VACTIONS) \
  void execute_vaccounts_action(action act){ \
    switch(act.name.value){ \
      BOOST_PP_SEQ_FOR_EACH(POPULATE_VACTION, DUMMY_MACRO, VACTIONS)\
      default: \
        break; \
    } \
  }

