#include "liquidportfolio.hpp" 

void liquidportfolio::newentry() {
  auto sym = BTC_SYMBOL;
  asset maximum_supply;
  maximum_supply.symbol = sym;
  btcoracle btc_oracle_table( _self, sym.code().raw() );
  auto existing = btc_oracle_table.find( sym.code().raw() );
  eosio::check(existing == btc_oracle_table.end(),
             "oracle entries already exist");
  btc_oracle_table.emplace( _self, [&]( auto& s ) {
      s.supply.symbol  = maximum_supply.symbol;
      s.price          = "";
  });
  sym = ETH_SYMBOL;
  maximum_supply.symbol = sym;
  ethoracle eth_oracle_table( _self, sym.code().raw() );
  eth_oracle_table.emplace( _self, [&]( auto& s ) {
      s.supply.symbol  = maximum_supply.symbol;
      s.price          = "";
  });
  sym = EOS_SYMBOL;
  maximum_supply.symbol = sym;
  eosoracle eos_oracle_table( _self, sym.code().raw() );
  eos_oracle_table.emplace( _self, [&]( auto& s ) {
      s.supply.symbol  = maximum_supply.symbol;
      s.price          = "";
  });
}

void liquidportfolio::updateoracle(oracle_struct payload) {
    std::vector<char> rawPayload = eosio::pack<oracle_struct>(payload);
    schedule_timer(_self, rawPayload, 300);
}

void liquidportfolio::login(login_struct payload) {
  auto vaccount = payload.vaccount;
  // Ensure this action is authorized by the player
  require_vaccount(vaccount);
  // Create a record in the table if the player doesn't exist in our app yet
  auto user_iterator = _users.find(vaccount.value);
  if (user_iterator == _users.end()) {
    user_iterator = _users.emplace(vaccount,  [&](auto& new_user) {
      new_user.vaccount = vaccount;
    });
  } 
}

void liquidportfolio::addaccount(user_struct payload) {
  auto vaccount = payload.vaccount;
  // Ensure this action is authorized by the player
  require_vaccount(vaccount);

  auto& user = _users.get(vaccount.value, "User doesn't exist");
  _users.modify(user, vaccount, [&](auto& modified_user) {
    if(payload.btc.empty() != true) {
      check(find(modified_user.btc.begin(), modified_user.btc.end(), payload.btc) == modified_user.btc.end(), "btc account already exists");
      modified_user.btc.push_back(payload.btc);
    }
    if(payload.eth.empty() != true) {
      check(find(modified_user.eth.begin(), modified_user.eth.end(), payload.eth) == modified_user.eth.end(), "eth account already exists");
      modified_user.eth.push_back(payload.eth);
    }
    if(payload.eos.empty() != true) {
      check(find(modified_user.eos.begin(), modified_user.eos.end(), payload.eos) == modified_user.eos.end(), "eos account already exists");
      modified_user.eos.push_back(payload.eos);
    }
  });
}