export default {



    eos: {

        files: [{
                fileName: 'eosio.token.cpp',
                isLeader: true,
                content: `/**
*  @file
*  @copyright defined in eos/LICENSE.txt
*/

#include "eosio.token.hpp"

namespace eosio {

void token::create( account_name issuer,
                    asset        maximum_supply )
{
    require_auth( _self );

    auto sym = maximum_supply.symbol;
    eosio_assert( sym.is_valid(), "invalid symbol name" );
    eosio_assert( maximum_supply.is_valid(), "invalid supply");
    eosio_assert( maximum_supply.amount > 0, "max-supply must be positive");

    stats statstable( _self, sym.name() );
    auto existing = statstable.find( sym.name() );
    eosio_assert( existing == statstable.end(), "token with symbol already exists" );

    statstable.emplace( _self, [&]( auto& s ) {
        s.supply.symbol = maximum_supply.symbol;
        s.max_supply    = maximum_supply;
        s.issuer        = issuer;
    });
}


void token::issue( account_name to, asset quantity, string memo )
{
    auto sym = quantity.symbol;
    eosio_assert( sym.is_valid(), "invalid symbol name" );
    eosio_assert( memo.size() <= 256, "memo has more than 256 bytes" );

    auto sym_name = sym.name();
    stats statstable( _self, sym_name );
    auto existing = statstable.find( sym_name );
    eosio_assert( existing != statstable.end(), "token with symbol does not exist, create token before issue" );
    const auto& st = *existing;

    require_auth( st.issuer );
    eosio_assert( quantity.is_valid(), "invalid quantity" );
    eosio_assert( quantity.amount > 0, "must issue positive quantity" );

    eosio_assert( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    eosio_assert( quantity.amount <= st.max_supply.amount - st.supply.amount, "quantity exceeds available supply");

    statstable.modify( st, 0, [&]( auto& s ) {
        s.supply += quantity;
    });

    add_balance( st.issuer, quantity, st.issuer );

    if( to != st.issuer ) {
        SEND_INLINE_ACTION( *this, transfer, {st.issuer,N(active)}, {st.issuer, to, quantity, memo} );
    }
}

void token::transfer( account_name from,
                        account_name to,
                        asset        quantity,
                        string       memo )
{
    eosio_assert( from != to, "cannot transfer to self" );
    require_auth( from );
    eosio_assert( is_account( to ), "to account does not exist");
    auto sym = quantity.symbol.name();
    stats statstable( _self, sym );
    const auto& st = statstable.get( sym );

    require_recipient( from );
    require_recipient( to );

    eosio_assert( quantity.is_valid(), "invalid quantity" );
    eosio_assert( quantity.amount > 0, "must transfer positive quantity" );
    eosio_assert( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    eosio_assert( memo.size() <= 256, "memo has more than 256 bytes" );


    sub_balance( from, quantity );
    add_balance( to, quantity, from );
}

void token::sub_balance( account_name owner, asset value ) {
    accounts from_acnts( _self, owner );

    const auto& from = from_acnts.get( value.symbol.name(), "no balance object found" );
    eosio_assert( from.balance.amount >= value.amount, "overdrawn balance" );


    if( from.balance.amount == value.amount ) {
        from_acnts.erase( from );
    } else {
        from_acnts.modify( from, owner, [&]( auto& a ) {
            a.balance -= value;
        });
    }
}

void token::add_balance( account_name owner, asset value, account_name ram_payer )
{
    accounts to_acnts( _self, owner );
    auto to = to_acnts.find( value.symbol.name() );
    if( to == to_acnts.end() ) {
        to_acnts.emplace( ram_payer, [&]( auto& a ){
        a.balance = value;
        });
    } else {
        to_acnts.modify( to, 0, [&]( auto& a ) {
        a.balance += value;
        });
    }
}

} /// namespace eosio

EOSIO_ABI( eosio::token, (create)(issue)(transfer) )`
            },

            {
                fileName: 'eosio.token.hpp',
                content: `/**
*  @file
*  @copyright defined in eos/LICENSE.txt
*/
#pragma once

#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include <string>

namespace eosiosystem {
    class system_contract;
}

namespace eosio {

    using std::string;

    class token : public contract {
        public:
        token( account_name self ):contract(self){}

        void create( account_name issuer,
                        asset        maximum_supply);

        void issue( account_name to, asset quantity, string memo );

        void transfer( account_name from,
                        account_name to,
                        asset        quantity,
                        string       memo );
        
        
        inline asset get_supply( symbol_name sym )const;
        
        inline asset get_balance( account_name owner, symbol_name sym )const;

        private:
        struct account {
            asset    balance;

            uint64_t primary_key()const { return balance.symbol.name(); }
        };

        struct currency_stats {
            asset          supply;
            asset          max_supply;
            account_name   issuer;

            uint64_t primary_key()const { return supply.symbol.name(); }
        };

        typedef eosio::multi_index<N(accounts), account> accounts;
        typedef eosio::multi_index<N(stat), currency_stats> stats;

        void sub_balance( account_name owner, asset value );
        void add_balance( account_name owner, asset value, account_name ram_payer );

        public:
        struct transfer_args {
            account_name  from;
            account_name  to;
            asset         quantity;
            string        memo;
        };
    };

    asset token::get_supply( symbol_name sym )const
    {
        stats statstable( _self, sym );
        const auto& st = statstable.get( sym );
        return st.supply;
    }

    asset token::get_balance( account_name owner, symbol_name sym )const
    {
        accounts accountstable( _self, owner );
        const auto& ac = accountstable.get( sym );
        return ac.balance;
    }

} /// namespace eosio`
            },

            {
                fileName: 'eosio.token.abi',
                content: `{
"version": "eosio::abi/1.0",
"types": [{
    "new_type_name": "account_name",
    "type": "name"
}],
"structs": [{
    "name": "transfer",
    "base": "",
    "fields": [
        {"name":"from", "type":"account_name"},
        {"name":"to", "type":"account_name"},
        {"name":"quantity", "type":"asset"},
        {"name":"memo", "type":"string"}
    ]
    },{
    "name": "create",
    "base": "",
    "fields": [
        {"name":"issuer", "type":"account_name"},
        {"name":"maximum_supply", "type":"asset"}
    ]
},{
    "name": "issue",
    "base": "",
    "fields": [
        {"name":"to", "type":"account_name"},
        {"name":"quantity", "type":"asset"},
        {"name":"memo", "type":"string"}
    ]
},{
    "name": "account",
    "base": "",
    "fields": [
        {"name":"balance", "type":"asset"}
    ]
    },{
    "name": "currency_stats",
    "base": "",
    "fields": [
        {"name":"supply", "type":"asset"},
        {"name":"max_supply", "type":"asset"},
        {"name":"issuer", "type":"account_name"}
    ]
    }
],
"actions": [{
    "name": "transfer",
    "type": "transfer",
    "ricardian_contract": ""
    },{
    "name": "issue",
    "type": "issue",
    "ricardian_contract": ""
    }, {
    "name": "create",
    "type": "create",
    "ricardian_contract": ""
    }

],
"tables": [{
    "name": "accounts",
    "type": "account",
    "index_type": "i64",
    "key_names" : ["currency"],
    "key_types" : ["uint64"]
    },{
    "name": "stat",
    "type": "currency_stats",
    "index_type": "i64",
    "key_names" : ["currency"],
    "key_types" : ["uint64"]
    }
],
"ricardian_clauses": [],
"abi_extensions": []
}`
            },
            {
                fileName: 'client.js',
                content: `(async () => {
try{
    
    console.log('contract', contract.create)
    var res = await contract.create('testooooooo1', '10000.0000 PKL', {
    authorization: account
    });
    console.log(res.processed.action_traces[0].console)
    console.log(res);
}catch(e){
    console.log(e);
}
})(); `
            }
        ]
    }

}
