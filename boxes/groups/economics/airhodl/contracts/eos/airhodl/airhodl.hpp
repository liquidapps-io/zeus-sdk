#pragma once

#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>
#include <eosiolib/time.hpp>

#include <string>

using namespace eosio;
using namespace std;

namespace airhodl {

   const name TOKEN = "dappservices"_n;

   class [[eosio::contract("airhodl")]] airhodl : public contract {
      public:
         using contract::contract;

         [[eosio::action]]
         void create( name   issuer,
                      asset  maximum_supply);

         [[eosio::action]]
         void issue( name to, asset quantity, string memo );

         [[eosio::action]]
         void activate( const symbol& symbol, time_point_sec start, time_point_sec end);

         [[eosio::action]]
         void grab( name owner, const symbol& symbol, name ram_payer );

         [[eosio::action]]
         void withdraw( name owner, const symbol& symbol );

         [[eosio::action]] 
         void stake( name owner, name provider, name service, asset quantity);

         [[eosio::action]] 
         void unstake( name owner, name provider, name service, asset quantity);

         //external action to watch
         void refund(name from, name to, asset quantity);

         static asset get_supply( name token_contract_account, symbol_code sym_code )
         {
            stats statstable( token_contract_account, sym_code.raw() );
            const auto& st = statstable.get( sym_code.raw() );
            return st.supply;
         }

         static asset get_balance( name token_contract_account, name owner, symbol_code sym_code )
         {
            accounts accountstable( token_contract_account, owner.value );
            const auto& ac = accountstable.get( sym_code.raw() );
            return ac.balance;
         }

      private:
         struct token_account {
            asset    balance;

            uint64_t primary_key()const { return balance.symbol.code().raw(); }
         };

         struct [[eosio::table]] account {
            asset    balance;
            asset    staked;
            bool     claimed;

            uint64_t primary_key()const { return balance.symbol.code().raw(); }
         };

         struct [[eosio::table]] currency_stats {
            asset    supply;
            asset    max_supply;
            name     issuer;
            asset    forfeiture;
            time_point_sec vesting_start;
            time_point_sec vesting_end;

            uint64_t primary_key()const { return supply.symbol.code().raw(); }
         };

         typedef eosio::multi_index< "accounts"_n, token_account > token_accounts;
         typedef eosio::multi_index< "accounts"_n, account > accounts;
         typedef eosio::multi_index< "stat"_n, currency_stats > stats;

         // void sub_balance( name owner, asset value );
         void add_balance( name owner, asset value, name ram_payer );
         void sub_stake( name owner, asset value );
         void add_stake( name owner, asset value );
   };

} /// namespace 