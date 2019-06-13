#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/action.hpp>
#include "./multi_index.hpp"
#include <boost/preprocessor/control/iif.hpp>
#include <boost/preprocessor/list/for_each.hpp>
#include <boost/preprocessor/seq/for_each.hpp>
#include <boost/preprocessor/seq/for_each_i.hpp>
#include <boost/preprocessor/seq/push_back.hpp>

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
eosio::public_key get_current_public_key(){ \
    return _pubkey; \
} \
void required_key(const eosio::public_key& pubkey){ \
    eosio::check(_pubkey == pubkey, "wrong public key"); \
} \
void unpack_exec_action(std::vector<char> payload){ \
    eosio::action res = eosio::unpack<eosio::action>( payload.data(), payload.size() ); \
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
    _pubkey = pubkey;\
    unpack_exec_action(payload); \
} \
TABLE vkey { \
  eosio::public_key pubkey; \
  name vaccount; \
  uint64_t primary_key(){return vaccount.value;} \
}; \
typedef dapp::multi_index<"vkey"_n, vkey> vkeys_t; \
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
void require_vaccount(name vaccount){ \
    auto pkey = getKey(vaccount); \
    required_key(pkey); \
} \
void setKey(name vaccount, eosio::public_key pubkey){ \
    vkeys_t vkeys_table(_self, _self.value); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing == vkeys_table.end(),"vaccount already exists"); \
    vkeys_table.emplace(_self,[&]( auto& new_key ){ \
      new_key.pubkey = pubkey; \
      new_key.vaccount = vaccount;\
    }); \
} \
eosio::public_key getKey(name vaccount){ \
    vkeys_t vkeys_table(_self, _self.value); \
    auto existing = vkeys_table.find(vaccount.value); \
    eosio::check(existing != vkeys_table.end(),"vaccount not found"); \
    return existing->pubkey; \
} 




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
