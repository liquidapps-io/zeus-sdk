#pragma once

#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/action.hpp>
#include <eosio/singleton.hpp>
#include "../dappservices/multi_index.hpp"
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

#ifndef VACCOUNTS_CROSSCHAIN_NONCE_VARIANCE
#define VACCOUNTS_CROSSCHAIN_NONCE_VARIANCE 5
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

#ifdef VACCOUNTS_CROSSCHAIN
#define VACCOUNTS_CHAIN_LOGIC() \
void unpack_exec_action(eosio::action res){ \
    execute_vaccounts_action(res);  \
} \
TABLE vchain { \
  eosio::checksum256 chainid; \
  eosio::name hostchain;\
  eosio::name hostcode;\
  uint64_t nonce;\
}; \
typedef eosio::singleton<"vchain"_n, vchain> vchain_t; \
[[eosio::action]] void xvinit(eosio::checksum256 chainid, name hostchain, name hostcode) { \
    require_auth(_self); \
    print("setting chainid:",chainid,"\n");\
    setChain(chainid, hostchain, hostcode); \
} \
void setChain(eosio::checksum256 chainid, name hostchain, name hostcode){ \
    vchain_t vchain_table(_self, _self.value); \
    eosio::check(!vchain_table.exists(),"chain id has already been set"); \
    auto vchain = vchain_table.get_or_default(); \
    vchain.chainid = chainid; \
    vchain.hostchain = hostchain; \
    vchain.hostcode = hostcode; \
    vchain.nonce = 0; \
    vchain_table.set(vchain, _self); \
} \
eosio::public_key getKey(name vaccount){ \
    vchain_t vchain_table(_self, _self.value); \
    auto vchain = vchain_table.get();\
    vkeys_t vkeys_table(vchain.hostcode, vchain.hostcode.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP, vchain.hostchain); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    return existing->pubkey; \
} \
eosio::public_key handleNonce(name vaccount){ \
    if(_verified == vaccount) { return getKey(vaccount); } \
    vchain_t vchain_table(_self, _self.value); \
    auto vchain = vchain_table.get();\
    vkeys_t vkeys_table(vchain.hostcode, vchain.hostcode.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP, vchain.hostchain); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    uint64_t nonce_max = existing->nonce + vchain.nonce;\
    int64_t nonce_min = nonce_max - VACCOUNTS_CROSSCHAIN_NONCE_VARIANCE;\
    if(nonce_min < 0) nonce_min = 0;\
    eosio::check((nonce_min <= _nonce) && (_nonce <= nonce_max),"nonce less than allowed VACCOUNTS_CROSSCHAIN_NONCE_VARIANCE or is invalid"); \
    vchain.nonce++; \
    vchain_table.set(vchain, _self); \
    _verified = vaccount;\
    return existing->pubkey; \
}
#else
#define VACCOUNTS_CHAIN_LOGIC() \
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
TABLE vchain { \
  eosio::checksum256 chainid; \
}; \
typedef eosio::singleton<"vchain"_n, vchain> vchain_t; \
[[eosio::action]] void xvinit(eosio::checksum256 chainid) { \
    require_auth(_self); \
    print("setting chainid:",chainid,"\n");\
    setChain(chainid); \
} \
void setChain(eosio::checksum256 chainid){ \
    vchain_t vchain_table(_self, _self.value); \
    eosio::check(!vchain_table.exists(),"chain id has already been set"); \
    auto vchain = vchain_table.get_or_default(); \
    vchain.chainid = chainid; \
    vchain_table.set(vchain, _self); \
} \
struct regaccount_action { \
  name vaccount; \
  EOSLIB_SERIALIZE( regaccount_action, (vaccount) ) \
}; \
[[eosio::action]] void regaccount(regaccount_action payload) { \
   setKey(payload.vaccount, get_current_public_key()); \
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
eosio::public_key getKey(name vaccount){ \
    vkeys_t vkeys_table(_self, _self.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    return existing->pubkey; \
} \
eosio::public_key handleNonce(name vaccount){ \
    if(_verified == vaccount) { return getKey(vaccount); } \
    vkeys_t vkeys_table(_self, _self.value, 1024, 64, VACCOUNTS_SHARD_PINNING, false, VACCOUNTS_DELAYED_CLEANUP); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    eosio::check(existing->nonce == _nonce,"invalid nonce"); \
    vkeys_table.modify(existing,_self,[&]( auto& v ){ \
      v.nonce++; \
    }); \
    _verified = vaccount;\
    return existing->pubkey; \
}
#endif

#ifdef VACCOUNTS_SUBSCRIBER
#define VACCOUNTS_DAPPSERVICE_LOGIC() \
eosio::signature _sig;\
std::vector<char> _payload;\
TABLE vhost { \
  eosio::name host; \
}; \
typedef eosio::singleton<"vhost"_n, vhost> vhost_t; \
[[eosio::action]] void xvinit(eosio::name host) { \
    require_auth(_self); \
    print("setting remote vaccount host:",host,"\n");\
    vhost_t vhost_table(_self,_self.value);\
    auto vhost = vhost_table.get_or_default();\
    vhost.host = host;\
    vhost_table.set(vhost,_self);\
} \
void unpack_exec_action(eosio::action res){ \
    execute_vaccounts_action(res);  \
} \
void require_vaccount(name vaccount){ \
    if(_verified == vaccount) return;\
    vhost_t vhost_table(_self,_self.value);\
    eosio::check(vhost_table.exists(), "remote vaccounts host has not been set"); \
    auto vhost = vhost_table.get();\
    action(permission_level{_self, "active"_n},\
          vhost.host, "xvauth"_n, std::make_tuple(_payload,_sig,_pubkey,vaccount))\
    .send();\
    _verified = vaccount;\
} \
SVC_RESP_VACCOUNTS(vexec)(std::vector<char> payload, eosio::signature sig, eosio::public_key pubkey, name current_provider){ \
    verify_signature(payload, sig, pubkey); \
    auto unpacked = unpack_payload(payload); \
    _nonce = unpacked.nonce; \
    _pubkey = pubkey;\
    _payload = payload;\
    _sig = sig;\
    unpack_exec_action(unpacked.action); \
}
#else
#define VACCOUNTS_DAPPSERVICE_LOGIC() \
VACCOUNTS_CHAIN_LOGIC()\
void require_vaccount(name vaccount){ \
    auto pkey = handleNonce(vaccount); \
    required_key(pkey); \
}\
TABLE vkey { \
  eosio::public_key pubkey; \
  name vaccount; \
  uint64_t nonce; \
  uint64_t primary_key() const {return vaccount.value;} \
}; \
typedef dapp::multi_index<"vkey"_n, vkey> vkeys_t; \
typedef eosio::multi_index<".vkey"_n,vkey> vkeys_t_v_abi;\
TABLE shardbucket_t {\
        std::vector<char> shard_uri;\
        uint64_t shard;\
        uint64_t primary_key() const { return shard; }\
};\
typedef eosio::multi_index<"vkey"_n, shardbucket_t> vkeys_t_abi;\
[[eosio::action]] void xvauth(std::vector<char> payload, eosio::signature sig, eosio::public_key pubkey, eosio::name vaccount) {\
    verify_signature(payload, sig, pubkey); \
    auto unpacked = unpack_payload(payload); \
    verify_chain(unpacked.chainid, unpacked.expiry); \
    _nonce = unpacked.nonce; \
    _pubkey = pubkey;\
    require_vaccount(vaccount); \
}\
void required_key(const eosio::public_key& pubkey){ \
    eosio::check(_pubkey == pubkey, "wrong public key"); \
} \
void verify_chain(eosio::checksum256 chainid, uint64_t expiry) { \
  eosio::check(chainid == getChain(),"invalid chain id"); \
  eosio::check(current_time_point().sec_since_epoch() <= expiry, "transaction has expired"); \
} \
eosio::checksum256 getChain(){ \
    vchain_t vchain_table(_self, _self.value); \
    auto existing = vchain_table.get(); \
    return existing.chainid; \
} \
SVC_RESP_VACCOUNTS(vexec)(std::vector<char> payload, eosio::signature sig, eosio::public_key pubkey, name current_provider){ \
    verify_signature(payload, sig, pubkey); \
    auto unpacked = unpack_payload(payload); \
    verify_chain(unpacked.chainid, unpacked.expiry); \
    _nonce = unpacked.nonce; \
    _pubkey = pubkey;\
    unpack_exec_action(unpacked.action); \
}
#endif

#define VACCOUNTS_DAPPSERVICE_ACTIONS_MORE() \
VACCOUNTS_DAPPSERVICE_LOGIC() \
eosio::public_key _pubkey;\
uint64_t _nonce;\
eosio::name _verified = ""_n; \
eosio::public_key get_current_public_key(){ \
    return _pubkey; \
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
}


#define POPULATE_VACTION(r, dummy, field) \
  case TONAME(BOOST_PP_SEQ_ELEM(1, field)).value: \
    { \
        auto payload_data = act.data_as<BOOST_PP_SEQ_ELEM(0, field)>(); \
        BOOST_PP_SEQ_ELEM(1, field)(payload_data); \
    } while(0); \
    break;

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