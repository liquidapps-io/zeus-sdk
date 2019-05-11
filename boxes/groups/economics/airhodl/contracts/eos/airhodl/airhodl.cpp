#include "airhodl.hpp"

namespace airhodl {

time_point current_time_point() {
   const static time_point ct{ microseconds{ static_cast<int64_t>( current_time() ) } };
   return ct;
}

void airhodl::create( name   issuer,
                    asset  maximum_supply )
{
    require_auth( _self );

    auto sym = maximum_supply.symbol;
    eosio_assert( sym.is_valid(), "invalid symbol name" );
    eosio_assert( maximum_supply.is_valid(), "invalid supply");
    eosio_assert( maximum_supply.amount > 0, "max-supply must be positive");

    stats statstable( _self, sym.code().raw() );
    auto existing = statstable.find( sym.code().raw() );
    eosio_assert( existing == statstable.end(), "token with symbol already exists" );

    statstable.emplace( _self, [&]( auto& s ) {
       s.supply.symbol     = maximum_supply.symbol;
       s.forfeiture.symbol = maximum_supply.symbol;
       s.max_supply    = maximum_supply;
       s.issuer        = issuer;
       s.vesting_start = time_point_sec().min();
       s.vesting_end   = time_point_sec().min();
    });
}

void airhodl::activate( const symbol& symbol, time_point_sec start, time_point_sec end) {
   auto sym_code_raw = symbol.code().raw();

   stats statstable( _self, sym_code_raw );
   auto existing = statstable.find( sym_code_raw );
   eosio_assert( existing != statstable.end(), "token with symbol does not exist, create token before activation" );
   const auto& st = *existing;

   require_auth( st.issuer );

   time_point_sec time_now = time_point_sec(current_time_point());
   eosio_assert(start > time_now, "vesting start must be in the future");
   eosio_assert(end > start, "vesting end must be later than vesting start");  

   statstable.modify( st, eosio::same_payer, [&]( auto& s ) {
      s.vesting_start = start;
      s.vesting_end   = end;
   });   
}


void airhodl::issue( name to, asset quantity, string memo )
{
    auto sym = quantity.symbol;
    eosio_assert( sym.is_valid(), "invalid symbol name" );
    eosio_assert( memo.size() <= 256, "memo has more than 256 bytes" );

    stats statstable( _self, sym.code().raw() );
    auto existing = statstable.find( sym.code().raw() );
    eosio_assert( existing != statstable.end(), "token with symbol does not exist, create token before issue" );
    const auto& st = *existing;

    require_auth( st.issuer );
    eosio_assert( quantity.is_valid(), "invalid quantity" );
    eosio_assert( quantity.amount > 0, "must issue positive quantity" );

    eosio_assert( quantity.symbol == st.supply.symbol, "symbol precision mismatch" );
    eosio_assert( quantity.amount <= st.max_supply.amount - st.supply.amount, "quantity exceeds available supply");

    statstable.modify( st, eosio::same_payer, [&]( auto& s ) {
       s.supply += quantity;
    });

    add_balance( to, quantity, st.issuer );
}

void airhodl::grab( name owner, const symbol& symbol, name ram_payer )
{
   require_auth( ram_payer );
   require_recipient( owner );

   auto sym_code_raw = symbol.code().raw();

   accounts acnts( _self, owner.value );
   auto it = acnts.find( sym_code_raw );
   eosio_assert(it != acnts.end(), "no balance to grab");
   eosio_assert(it->claimed == false, "already grabbed");

   asset balance = it->balance;
   asset staked  = it->staked;
   acnts.erase(it);

   acnts.emplace( ram_payer, [&]( auto& a ){
      a.balance = balance;
      a.staked  = staked;
      a.claimed = true;
   });
}

void airhodl::withdraw( name owner, const symbol& symbol ) {   
   require_auth(owner);

   //Find token stats
   auto sym_code_raw = symbol.code().raw();

   stats statstable( _self, sym_code_raw );
   auto existing = statstable.find( sym_code_raw );
   eosio_assert( existing != statstable.end(), "symbol does not exist for withdrawal" );
   const auto& st = *existing;

   //Check if vesting has started
   eosio_assert(st.vesting_start > time_point_sec().min(),"vesting has not started");

   //Find hodlaccts
   accounts from_acnts( _self, owner.value );
   const auto& from = from_acnts.get( sym_code_raw, "no balance object found" );
   
   //Ensure that stake is 0
   eosio_assert(from.staked.amount == 0, "you must fully unstake to withdraw");

   //calculate vesting ratio
   double time_elapsed = double(time_point_sec(current_time_point()).utc_seconds - st.vesting_start.utc_seconds);
   double vesting_duration = double(st.vesting_end.utc_seconds - st.vesting_start.utc_seconds);
   double vesting_ratio = time_elapsed / vesting_duration;

   //calculate vested_balance
   uint64_t balance_vested = static_cast<uint64_t>(vesting_ratio * double(from.balance.amount));
   uint64_t balance_forfeited = from.balance.amount - balance_vested;
   double   bonus_share = double(st.forfeiture.amount) * (double(from.balance.amount) / double(st.supply.amount));
   uint64_t bonus_vested = static_cast<uint64_t>(vesting_ratio * bonus_share);
   asset    payout = asset(balance_vested + bonus_vested, st.supply.symbol);

   //update tables
   statstable.modify(st, eosio::same_payer, [&](auto &s) {
      //decrease supply by the amount paid out
      s.supply -= (asset(balance_vested,symbol) + asset(bonus_vested,symbol)); 
      //increase forfeight hodl by forfeight balance, but subtract paid out forfeitures
      s.forfeiture += (asset(balance_forfeited,symbol) - asset(bonus_vested,symbol)); 
   });

   //erase hodlaccts table
   from_acnts.erase(from);

   //must have opened a balance of DAPP to receive the transfer
   token_accounts token_acnts(TOKEN,owner.value);
   const auto& token = token_acnts.get( sym_code_raw, "no destination balance found. please open an account with dappservices" );

   //transfer tokens
   action(permission_level{_self, "active"_n}, 
      TOKEN, "transfer"_n,
      std::make_tuple(_self, owner, payout, std::string("Withdrawal from AirHODL")))
   .send();
}

void airhodl::stake( name owner, name provider, name service, asset quantity) {
   require_auth(owner);

   //add stake asserts if they have enough available tokens
   add_stake(owner,quantity);

   //perform third party staking
   action(permission_level{_self, "active"_n}, 
      TOKEN, "staketo"_n,
      std::make_tuple(_self, owner, provider, service, quantity))
   .send();
}

void airhodl::unstake( name owner, name provider, name service, asset quantity) {
   require_auth(owner);

   //perform third party unstaking
   //we wont bother asserting here if they are attempting to unstake too much
   //because the inline action will assert that
   //we sub the stake once the refund request is successful
   action(permission_level{_self, "active"_n}, 
      TOKEN, "unstaketo"_n,
      std::make_tuple(_self, owner, provider, service, quantity))
   .send();
}

void airhodl::refund(name from, name to, asset quantity) {
   if(from == _self) {
      sub_stake(to,quantity);
   }   
}

void airhodl::add_balance( name owner, asset value, name ram_payer )
{
   accounts to_acnts( _self, owner.value );
   auto to = to_acnts.find( value.symbol.code().raw() );
   if( to == to_acnts.end() ) {
      to_acnts.emplace( ram_payer, [&]( auto& a ){
        a.balance = value;
        a.staked.symbol = value.symbol;
        a.claimed = false;
      });
   } else {
      to_acnts.modify( to, eosio::same_payer, [&]( auto& a ) {
        a.balance += value;
      });
   }
}

void airhodl::add_stake( name owner, asset value ) {
   accounts from_acnts( _self, owner.value );

   const auto& from = from_acnts.get( value.symbol.code().raw(), "no balance object found" );
   eosio_assert( from.balance.amount >= value.amount, "overdrawn balance" );

   if(from.claimed) {
      from_acnts.modify( from, owner, [&]( auto& a ) {
         a.balance -= value;
         a.staked += value;
      });
   } else {
      //lets perform a grab if they haven't yet
      asset balance = from.balance - value;
      asset staked  = from.staked + value;
      from_acnts.erase(from);

      from_acnts.emplace( owner, [&]( auto& a ){
         a.balance = balance;
         a.staked  = staked;
         a.claimed = true;
      });
   }   
}

void airhodl::sub_stake( name owner, asset value )
{
   accounts from_acnts( _self, owner.value );

   const auto& from = from_acnts.get( value.symbol.code().raw(), "no balance object found" );
   eosio_assert( from.staked.amount >= value.amount, "overdrawn stake" );

   from_acnts.modify( from, owner, [&]( auto& a ) {
      a.balance += value;
      a.staked -= value;
   });
}

extern "C" void apply( uint64_t receiver, uint64_t code, uint64_t action ) {
  if( code == TOKEN.value && action == name("refreceipt").value ) {
    execute_action<airhodl>( name(receiver), name(code), &airhodl::refund );
  } else if( code == receiver ) {
    switch( action ) {
      EOSIO_DISPATCH_HELPER( airhodl, (create)(issue)(activate)
                                          (grab)(withdraw)(stake)(unstake));
    }                                       
  }
}

} /// namespace airhodl
