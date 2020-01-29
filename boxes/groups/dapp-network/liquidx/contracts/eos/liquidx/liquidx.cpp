#include <cmath>
#include <eosio/eosio.hpp>
#include <eosio/transaction.hpp>
using namespace eosio;
using namespace std;
#include <eosio/action.hpp>
#include <eosio/asset.hpp>
#include <eosio/contract.hpp>
#include <eosio/dispatcher.hpp>
#include <eosio/eosio.hpp>
#include <eosio/name.hpp>
#include "../Common/base/base64.hpp"
#include "../Common/events.hpp"
#include <boost/preprocessor/control/iif.hpp>
#include <boost/preprocessor/list/for_each.hpp>
#include <boost/preprocessor/seq/for_each.hpp>
#include <boost/preprocessor/seq/for_each_i.hpp>
#include <boost/preprocessor/seq/push_back.hpp>
#include <eosio/singleton.hpp>


CONTRACT liquidx : public eosio::contract {
public:
  using contract::contract;

  TABLE accountlink {
    uint64_t id;
    name allowed_account; // sister chain account, for both consumers and DSPs
    name chain_name; // sister chain name
    uint128_t by_chain_account() const {
      return _by_chain_account(chain_name, allowed_account);
    }
    static uint128_t _by_chain_account(name chain, name account) {
      return (uint128_t{chain.value}<<64) | account.value;
    }
    uint64_t primary_key()const { return id; }
  };


  struct chain_metadata_t {
    bool is_public;
    bool is_single_node;
    std::string dappservices_contract;
    std::string chain_id;
    std::string type; // EOSIO/...
    std::vector<std::string> endpoints;
    std::vector<std::string> p2p_seeds;
    std::string chain_json_uri;
  };

  TABLE chainentry {
    chain_metadata_t chain_meta;
  };

  typedef eosio::multi_index<"accountlink"_n, accountlink,
        indexed_by<"bychain"_n,
                 const_mem_fun<accountlink, uint128_t,
                               &accountlink::by_chain_account>>> accountlinks;

  typedef eosio::singleton<"chainentry"_n, chainentry> chainentries;

  [[eosio::action]] void setchain(name chain_name, chain_metadata_t chain_meta) {
    require_auth(chain_name);
    chainentries chainentries_table(_self, chain_name.value);
    chainentry new_chain;
    new_chain.chain_meta = chain_meta;
    chainentries_table.set(new_chain, chain_name);
  }

  [[eosio::action]] void addaccount(name owner, name chain_account, name chain_name) {
    require_auth(owner);
    accountlinks accountlinks_table(_self, owner.value);
    accountlinks_table.emplace(owner, [&](auto &a) {
      a.id = accountlinks_table.available_primary_key();
      a.allowed_account = chain_account;
      a.chain_name = chain_name;
    });
  }
  [[eosio::action]] void rmvaccount(name owner, name chain_account, name chain_name) {
    require_auth(owner);
    accountlinks accountlinks_table(_self, owner.value);
    auto cidx = accountlinks_table.get_index<"bychain"_n>();

    auto idxKey =
        accountlink::_by_chain_account(chain_name, chain_account);
    auto acctLink = cidx.find(idxKey);
    check(acctLink != cidx.end(), "account does not exist");
    cidx.erase(acctLink);
  }

};

