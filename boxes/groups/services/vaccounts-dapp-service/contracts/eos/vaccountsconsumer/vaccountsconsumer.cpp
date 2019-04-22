#include "../dappservices/vaccounts.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  VACCOUNTS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  VACCOUNTS_SVC_COMMANDS() 

#define CONTRACT_NAME() vaccountsconsumer 


CONTRACT_START()

  TABLE vkey {
      eosio::public_key pubkey;
  };
  typedef eosio::singleton<"vkey"_n, vkey> vkeys_t;

  [[eosio::action]] void hello(name vaccount, uint64_t b, uint64_t c) {
    require_vaccount(vaccount);
    
    print("hello from ");
    print(vaccount);
    print(" ");
    print(b + c);
    print("\n");
  }
  [[eosio::action]] void regaccount(name vaccount) {
    setKey(vaccount, get_current_public_key());
  }
  
  void execute_vaccounts_action(action act){
    switch(act.name.value){
      case name("hello").value:
        hello("1"_n, 1, 2);
        break;
      case name("regaccount").value:
        regaccount("1"_n);
        break;
    }
  }

  
  void require_vaccount(name vaccount){
    auto pkey = getKey(vaccount);
    required_key(pkey);
  }
  
  void setKey(name vaccount, eosio::public_key pubkey){
    vkeys_t vkeys_table(_self, vaccount.value);
    eosio::check(!vkeys_table.exists(),"vaccount already exists");
    vkey new_key;
    new_key.pubkey = pubkey;
    vkeys_table.set(new_key, _self);
  }
  
  eosio::public_key getKey(name vaccount){
    vkeys_t vkeys_table(_self, vaccount.value);
    eosio::check(vkeys_table.exists(),"vaccount not found");
    return vkeys_table.get().pubkey;
  }
  
CONTRACT_END((hello)(regaccount))
