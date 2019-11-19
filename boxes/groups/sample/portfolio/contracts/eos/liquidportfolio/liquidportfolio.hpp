#pragma once
#define VACCOUNTS_DELAYED_CLEANUP 120
 
#include <eosio/eosio.hpp>
#include <eosio/system.hpp>
#include "../dappservices/vaccounts.hpp"
#include "../dappservices/multi_index.hpp"
#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS \
  VACCOUNTS_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS \
  CRON_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()VACCOUNTS_SVC_COMMANDS()ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()
#define CONTRACT_NAME() liquidportfolio
#define BTC_SYMBOL symbol(symbol_code("BTC"), 4)
#define ETH_SYMBOL symbol(symbol_code("ETH"), 4)
#define EOS_SYMBOL symbol(symbol_code("EOS"), 4)
using std::string;

using namespace std;
using namespace eosio;

CONTRACT_START()
  private:

    TABLE oracle_btc {
       asset supply;
       string price;
       uint64_t primary_key()const { return supply.symbol.code().raw(); }
    };
    typedef eosio::multi_index<"btcprice"_n, oracle_btc> btcoracle;
    
    TABLE oracle_eth {
       asset supply;
       string price;
       uint64_t primary_key()const { return supply.symbol.code().raw(); }
    };
    typedef eosio::multi_index<"ethprice"_n, oracle_eth> ethoracle;
    
    TABLE oracle_eos {
       asset supply;
       string price;
       uint64_t primary_key()const { return supply.symbol.code().raw(); }
    };
    typedef eosio::multi_index<"eosprice"_n, oracle_eos> eosoracle;

    struct [[eosio::table]] user_info {
      name          vaccount;
      vector<vector<uint8_t>>  btc;
      vector<vector<uint8_t>>  eth;
      vector<vector<uint8_t>>  eos;

      auto primary_key() const { return vaccount.value; }
    };

    typedef dapp::multi_index<name("users"), user_info> users_table;
    typedef eosio::multi_index<".users"_n, user_info> users_table_v_abi;
    TABLE shardbucket {
        std::vector<char> shard_uri;
        uint64_t shard;
        uint64_t primary_key() const { return shard; }
    };
    typedef eosio::multi_index<"users"_n, shardbucket> users_table_abi;

    users_table _users;

  public:
    liquidportfolio( name receiver, name code, datastream<const char*> ds ):contract(receiver, code, ds),
                       _users(receiver, receiver.value, 1024, 64, false, false, VACCOUNTS_DELAYED_CLEANUP) {}

    [[eosio::action]]
    void newentry();

    struct user_struct {
      name vaccount;
      vector<uint8_t> btc;
      vector<uint8_t> eth;
      vector<uint8_t> eos;
      EOSLIB_SERIALIZE( user_struct, (vaccount)(btc)(eth)(eos) )
    };

    struct login_struct {
      name vaccount;
      EOSLIB_SERIALIZE( login_struct, (vaccount) )
    };

    struct oracle_struct {
      name vaccount;
      std::vector<char> btc;
      std::vector<char> eth;
      std::vector<char> eos;
      EOSLIB_SERIALIZE( oracle_struct, (vaccount)(btc)(eth)(eos) )
    };
    
    [[eosio::action]]
    void login(login_struct payload);
    
    [[eosio::action]]
    void addaccount(user_struct payload);
  
    [[eosio::action]]
    void updateoracle(oracle_struct payload);
    
    bool timer_callback(name timer, std::vector<char> rawPayload, uint32_t seconds){
      auto payload = eosio::unpack<oracle_struct>(rawPayload);
      auto sym = BTC_SYMBOL;
      asset maximum_supply;
      maximum_supply.symbol = sym;
      string res;
      getURI(payload.btc, [&]( auto& results ) { 
        res = string( results[0].result.begin(), results[0].result.end() );
        return results[0].result;
      });
      btcoracle btc_oracle_table( _self, sym.code().raw() );
      auto btc_existing = btc_oracle_table.find( sym.code().raw() );
      const auto &btc_st = *btc_existing;
      btc_oracle_table.modify(btc_st, eosio::same_payer,
        [&](auto &s) { 
          s.price = res; 
        }
      );
      sym = ETH_SYMBOL;
      maximum_supply.symbol = sym;
      getURI(payload.eth, [&]( auto& results ) { 
        res = string( results[0].result.begin(), results[0].result.end() );
        return results[0].result;
      });
      ethoracle eth_oracle_table( _self, sym.code().raw() );
      auto eth_existing = eth_oracle_table.find( sym.code().raw() );
      const auto &eth_st = *eth_existing;
      eth_oracle_table.modify(eth_st, eosio::same_payer,
        [&](auto &s) { 
          s.price = res; 
        }
      );
      sym = EOS_SYMBOL;
      maximum_supply.symbol = sym;
      getURI(payload.eos, [&]( auto& results ) { 
        res = string( results[0].result.begin(), results[0].result.end() );
        return results[0].result;
      });
      eosoracle eos_oracle_table( _self, sym.code().raw() );
      auto eos_existing = eos_oracle_table.find( sym.code().raw() );
      const auto &eos_st = *eos_existing;
      eos_oracle_table.modify(eos_st, eosio::same_payer,
        [&](auto &s) { 
          s.price = res; 
        }
      );
      return true;
    }
    
    VACCOUNTS_APPLY(((login_struct)(login))((user_struct)(addaccount))((oracle_struct)(updateoracle)))
CONTRACT_END((login)(addaccount)(xdcommit)(regaccount)(xvinit)(newentry)(updateoracle))