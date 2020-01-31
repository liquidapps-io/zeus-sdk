/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */
 
#include "coldtoken.hpp"

using namespace eosio;

[[eosio::action]] void coldtoken::create( name issuer,
                    asset        maximum_supply)
{
    require_auth( _self );

    auto sym = maximum_supply.symbol;
    eosio::check( sym.is_valid(), "invalid symbol name" );
    eosio::check( maximum_supply.is_valid(), "invalid supply");
    eosio::check( maximum_supply.amount > 0, "max-supply must be positive");

    stats statstable( _self, sym.code().raw() );
    auto existing = statstable.find( sym.code().raw() );
    eosio::check( existing == statstable.end(), "token with symbol already exists" );

    statstable.emplace( _self, [&]( auto& s ) {
       s.supply.symbol = maximum_supply.symbol;
       s.max_supply    = maximum_supply;
       s.issuer        = issuer;
    });
}


[[eosio::action]] void coldtoken::issue( name to, asset quantity, string memo )
{
    auto sym = quantity.symbol;
    eosio::check( sym.is_valid(), "invalid symbol name" );
    eosio::check( memo.size() <= 256, "memo has more than 256 bytes" );

    auto sym_name = sym.code().raw();
    stats statstable( _self, sym_name );
    auto existing = statstable.find( sym_name );
    eosio::check( existing != statstable.end(), "token with symbol does not exist, create token before issue" );
    const auto& st = *existing;

    require_auth( st.issuer );
    eosio::check( quantity.is_valid(), "invalid quantity" );
    eosio::check( quantity.amount > 0, "must issue positive quantity" );

    eosio::check( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    eosio::check( quantity.amount <= st.max_supply.amount - st.supply.amount, "quantity exceeds available supply");

    statstable.modify( st, eosio::same_payer, [&]( auto& s ) {
       s.supply += quantity;
    });

    add_balance( st.issuer, quantity, st.issuer );

    if( to != st.issuer ) {
       SEND_INLINE_ACTION( *this, transfer, {st.issuer,"active"_n}, {st.issuer, to, quantity, memo} );
    }
}

[[eosio::action]] void coldtoken::transfer( name from,
                      name to,
                      asset        quantity,
                      string       memo )
{
    eosio::check( from != to, "cannot transfer to self" );
    require_auth( from );
    eosio::check( is_account( to ), "to account does not exist");
    auto sym = quantity.symbol.code().raw();
    stats statstable( _self, sym );
    const auto& st = statstable.get( sym );

    require_recipient( from );
    require_recipient( to );

    eosio::check( quantity.is_valid(), "invalid quantity" );
    eosio::check( quantity.amount > 0, "must transfer positive quantity" );
    eosio::check( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    eosio::check( memo.size() <= 256, "memo has more than 256 bytes" );

    sub_balance( from, quantity);
    add_balance( to, quantity, from);
}


void coldtoken::add_balance( name owner, asset value, name ram_payer)
{
   accounts_t to_acnts( 
    _self, // contract
    owner.value, // scope
    1024,  // optional: shards per table
    64,  // optional: buckets per shard
    false, // optional: pin shards in RAM - (buckets per shard) X (shards per table) X 32B - 2MB in this example
    false // optional: pin buckets in RAM - keeps most of the data in RAM. should be evicted manually after the process
    );
   auto to = to_acnts.find( value.symbol.code().raw() );
   if( to == to_acnts.end() ) {
      to_acnts.emplace(ram_payer, [&]( auto& a ){
        a.balance = value;
      });
   } else {
      to_acnts.modify( *to, ram_payer, [&]( auto& a ) {
        a.balance += value;
      });
   }
}

void coldtoken::sub_balance( name owner, asset value)
{
   accounts_t from_acnts(  _self, owner.value, 1024, 64, false, false);
  const auto& from = from_acnts.get( value.symbol.code().raw(), "no balance object found" );
   eosio::check( from.balance.amount >= value.amount, "overdrawn balance" );
  if( from.balance.amount == value.amount ) {
      from_acnts.erase( from );
  } else {
      from_acnts.modify( from, eosio::same_payer, [&]( auto& a ) {
          a.balance -= value;
      });
  }
}
