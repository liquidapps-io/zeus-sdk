/**
 *  @file
 *  @copyright defined in eos/LICENSE.txt
 */

#include "vgrab.hpp"

using namespace eosio;

[[eosio::action]] void vgrab::create( name issuer,
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


[[eosio::action]] void vgrab::issue( name to, asset quantity, string memo )
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

[[eosio::action]] void vgrab::coldissue( name to, asset quantity, string memo )
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

    add_cold_balance( to, quantity, st.issuer );
}
[[eosio::action]] void vgrab::transfer( name from,
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

[[eosio::action]] void vgrab::store( name from, asset quantity){
    require_auth( from );
    auto sym = quantity.symbol.code().raw();
    stats statstable( _self, sym );
    const auto& st = statstable.get( sym );

    require_recipient( from );

    eosio::check( quantity.is_valid(), "invalid quantity" );
    eosio::check( quantity.amount > 0, "must store positive quantity" );
    eosio::check( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    
    sub_balance( from, quantity);
    add_cold_balance( from, quantity, from);
}

[[eosio::action]] void vgrab::withdraw( name to, asset quantity){
    require_auth( to );
    auto sym = quantity.symbol.code().raw();
    stats statstable( _self, sym );
    const auto& st = statstable.get( sym );

    require_recipient( to );

    eosio::check( quantity.is_valid(), "invalid quantity" );
    eosio::check( quantity.amount > 0, "must withdraw positive quantity" );
    eosio::check( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    
    sub_cold_balance( to, quantity);
    add_balance( to, quantity, to);  
}
void vgrab::add_balance( name owner, asset value, name ram_payer)
{
   accounts_t to_acnts( _self, owner.value );
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

void vgrab::sub_balance( name owner, asset value)
{
   accounts_t from_acnts( _self, owner.value );
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



void vgrab::add_cold_balance( name owner, asset value, name ram_payer)
{
   cold_accounts_t to_acnts( _self, owner.value );
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

void vgrab::sub_cold_balance( name owner, asset value)
{
   cold_accounts_t from_acnts( _self, owner.value );
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
