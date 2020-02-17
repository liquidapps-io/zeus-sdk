#define VACCOUNTS_DELAYED_CLEANUP 120
#define USE_ADVANCED_IPFS

#include "../dappservices/vaccounts.hpp"
#include "../dappservices/ipfs.hpp"
#include "../dappservices/oracle.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS \
  VACCOUNTS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()VACCOUNTS_SVC_COMMANDS()ORACLE_SVC_COMMANDS()  
  
#define CONTRACT_NAME() combined 

CONTRACT_START()  
  TABLE luckynum {
      name vaccount;
      std::string num;
      std::string seed;
      uint64_t primary_key()const {return vaccount.value;}
  };

  TABLE tokens {
    asset balance;
    uint64_t primary_key() const { return balance.symbol.code().raw(); }
  };

  TABLE users {
    name vaccount;
    uint64_t primary_key() const { return vaccount.value; }
  };

  TABLE shardbucket {
    std::vector<char> shard_uri;
    uint64_t shard;
    uint64_t primary_key() const { return shard; }
  };

  typedef dapp::multi_index<"luckynum"_n, luckynum> luckynum_t; 
  typedef eosio::multi_index<".luckynum"_n, luckynum> luckynum_v_abi;
  typedef eosio::multi_index<"luckynum"_n, shardbucket> luckynum_t_abi;
  
  typedef dapp::multi_index<"tokens"_n, tokens> tokens_t; 
  typedef eosio::multi_index<".tokens"_n, tokens> tokens_v_abi;
  typedef eosio::multi_index<"tokens"_n, shardbucket> tokens_t_abi;

  typedef dapp::multi_index<"users"_n, users> users_t; 
  typedef eosio::multi_index<".users"_n, users> users_v_abi;
  typedef eosio::multi_index<"users"_n, shardbucket> users_t_abi;

  struct get_token_payload {
      name vaccount;
      name to;
      asset quantity;
      EOSLIB_SERIALIZE( get_token_payload, (vaccount)(to)(quantity) )
  };

  struct get_lucky_payload {
      name vaccount;
      std::string seed;    
      EOSLIB_SERIALIZE( get_lucky_payload, (vaccount)(seed) )
  };

  [[eosio::action]] void regboth(regaccount_action payload) {
    users_t user(_self,_self.value);
    user.emplace(_self, [&](auto &a) {
      a.vaccount = payload.vaccount;
    });
  }

  [[eosio::action]] void issue(get_token_payload payload) {
    add_balance(payload.vaccount,payload.quantity);
  }

  [[eosio::action]] void transfer(get_token_payload payload) {
    require_vaccount(payload.vaccount);

    users_t user(_self,_self.value);    
    auto &from = user.get(payload.vaccount.value, "From account does not exist");
    auto &to = user.get(payload.to.value, "To account does not exist");

    sub_balance(payload.vaccount, payload.quantity);
    add_balance(payload.to, payload.quantity);
  }
  
  [[eosio::action]] void getlucky(get_lucky_payload payload) {
    require_vaccount(payload.vaccount);
    runlucky(payload.vaccount, payload.seed);
  }

  [[eosio::action]] void getlucky2(get_lucky_payload payload) {
    require_vaccount(payload.vaccount);
    runlucky(payload.vaccount, payload.seed);
    string str = "random://1024/" + payload.seed + "1";
    vector<char> uri(str.begin(), str.end());
    auto rawnum = getURI(uri, [&]( auto& results ) { 
        return results[0].result;
    });
  }

  [[eosio::action]] void testlucky(get_lucky_payload payload) {
    require_vaccount(payload.vaccount);
    string str = "random://1024/" + payload.seed;
    vector<char> uri(str.begin(), str.end());
    auto rawnum = getURI(uri, [&]( auto& results ) { 
        return results[0].result;
    });
  }

  [[eosio::action]] void checklucky(get_lucky_payload payload) {
    require_vaccount(payload.vaccount);
    luckynum_t lucky(_self, _self.value);
    auto existing = lucky.find(payload.vaccount.value);
    eosio::check(existing != lucky.end(), "no lucky results found");
    eosio::check(existing->seed == payload.seed, "seed does not match");
  }

  private:
    void sub_balance(name owner, asset value) {
      tokens_t from_acnts(_self, owner.value);
      auto &from = from_acnts.get(value.symbol.code().raw(), "no balance object found");
      check(from.balance.amount >= value.amount, "overdrawn balance");

      from_acnts.modify(from, _self, [&](auto &a) {
        a.balance -= value;
      });
    }

    void add_balance(name owner, asset value) {
      tokens_t to_acnts(_self, owner.value);
      auto to = to_acnts.find(value.symbol.code().raw());
      if (to == to_acnts.end())
      {
        to_acnts.emplace(_self, [&](auto &a) {
          a.balance = value;
        });
      }
      else
      {
        to_acnts.modify(to, _self, [&](auto &a) {
          a.balance += value;
        });
      }
    }

    void runlucky(name vaccount, std::string seed) {
      string str = "random://1024/" + seed;
      vector<char> uri(str.begin(), str.end());
      auto rawnum = getURI(uri, [&]( auto& results ) { 
          return results[0].result;
      });
      std::string num(rawnum.begin(), rawnum.end());
      luckynum_t lucky(_self, _self.value);
      auto existing = lucky.find(vaccount.value);
      if(existing == lucky.end()) {
          lucky.emplace(_self, [&]( auto& a ) {
              a.vaccount = vaccount;
              a.seed = seed;
              a.num = num;
          });
      } else {
          lucky.modify(existing, _self, [&]( auto& a ){
              a.seed = seed;
              a.num = num;
          });
      }
    }
  
  VACCOUNTS_APPLY(((regaccount_action)(regboth))((get_token_payload)(issue))((get_token_payload)(transfer))((get_lucky_payload)(getlucky))((get_lucky_payload)(getlucky2))((get_lucky_payload)(testlucky))((get_lucky_payload)(checklucky)))
  
CONTRACT_END((regboth)(issue)(transfer)(getlucky)(getlucky2)(testlucky)(checklucky)(regaccount)(xdcommit)(xvinit))