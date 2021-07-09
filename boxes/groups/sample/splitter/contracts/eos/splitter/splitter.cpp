#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <eosio/asset.hpp>

using namespace eosio;
using namespace std;

CONTRACT splitter : public eosio::contract {
    using contract::contract;
    public:

    const name DAPPSERVICES_ACCOUNT = "dappservices"_n;
    const symbol DAPPSERVICES_TOKEN_SYMBOL = symbol(symbol_code("DAPP"), 4);
    
    struct payout {
        name account;
        double percentage;
    };

    struct [[eosio::table]] account {
      asset    balance;
      uint64_t primary_key()const { return balance.symbol.code().raw(); }
    };
    typedef eosio::multi_index< "accounts"_n, account > accounts;

  [[eosio::action]]
  void claim(name account, bool all) {
    accounts accountstable(DAPPSERVICES_ACCOUNT,_self.value);
    const auto& splitter_dappservices_balance = accountstable.get( DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with dappservices" );
    accounts local_self_accountstable(_self,_self.value);   
    const auto& local_self_balance = local_self_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with self");
    payouts_def payouttable(_self, _self.value);
    auto table = payouttable.get();
    vector<payout> payouts = table.payouts;
    auto itr = payouts.begin();
    // bool authorized = false;
    // claim all or one
    while(itr != payouts.end()) {
      // dappservices balance - local self balance to be claimed by others * percentage
      auto transfer_quantity = asset((splitter_dappservices_balance.balance.amount - local_self_balance.balance.amount) * itr->percentage, DAPPSERVICES_TOKEN_SYMBOL);
      if(all == true) {
        // authorized = true;
        eosio::check(transfer_quantity.amount > 0, "splitter balance must be greater than 0 to claim");
        require_auth(_self);
        string transfer_memo = "Distributing payout";
        action(
            permission_level{_self,"active"_n},
            DAPPSERVICES_ACCOUNT,
            "transfer"_n,
            std::make_tuple(_self, itr->account, transfer_quantity, transfer_memo)
        ).send();
      } else {
        require_auth(account);
        accounts local_accountstable(_self,account.value);
        const auto& local_self_balance = local_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with self");
        auto balance_itr = local_accountstable.find(DAPPSERVICES_TOKEN_SYMBOL.code().raw());   
        if(itr->account == account){
          // authorized = true;
          auto full_balance = asset(balance_itr->balance.amount + transfer_quantity.amount, DAPPSERVICES_TOKEN_SYMBOL);
          eosio::check(full_balance.amount > 0, "full balance must be greater than 0 to claim");
          string transfer_memo = "Distributing payout";
          action(
              permission_level{_self,"active"_n},
              DAPPSERVICES_ACCOUNT,
              "transfer"_n,
              std::make_tuple(_self, itr->account, full_balance, transfer_memo)
          ).send();
          subtract_balance(itr->account, balance_itr->balance.amount);
          subtract_balance(_self, balance_itr->balance.amount);
        } else {
          add_balance(itr->account, transfer_quantity.amount);
          add_balance(_self, transfer_quantity.amount);
        }
      }
      itr++;
    }
    // comment in if only authorized accounts can claim
    // eosio::check(authorized, "account used is not authorized to claim");
  }

  [[eosio::action]]
  void setup(vector<payout> payouts) {
    require_auth(_self);
    double total = 0;
    accounts self_accountstable(DAPPSERVICES_ACCOUNT,_self.value);
    self_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with dappservices");
    accounts local_self_accountstable(_self,_self.value);
    local_self_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with self");
    for (auto &payout : payouts) {
      total += payout.percentage;
      accounts account_accountstable(DAPPSERVICES_ACCOUNT,payout.account.value);
      account_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with dappservices");
      accounts local_account_accountstable(_self,payout.account.value);
      local_account_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with self");
    }
    eosio::check(total == 1, "total percentage must equal 1 (100%) between all owners");
    payouts_def payouttable(_self, _self.value);
    auto table = payouttable.get_or_default();
    table.payouts = payouts;
    payouttable.set(table, _self);
  }

  [[eosio::action]]
  void open( const name& owner, const name& ram_payer )
  {
    require_auth( ram_payer );
    check( is_account( owner ), "owner account does not exist" );
    auto sym_code_raw = DAPPSERVICES_TOKEN_SYMBOL.code().raw();
    accounts acnts( get_self(), owner.value );
    auto it = acnts.find( sym_code_raw );
    if( it == acnts.end() ) {
      acnts.emplace( ram_payer, [&]( auto& a ){
        a.balance = asset{0, DAPPSERVICES_TOKEN_SYMBOL};
      });
    }
  }
  
  private:
  
  TABLE payouts {
    vector<payout> payouts;
  };

  void add_balance(name account, double quantity_amount) {
    accounts local_accountstable(_self,account.value);   
    const auto& destination_balance = local_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with self");
    auto itr = local_accountstable.find(DAPPSERVICES_TOKEN_SYMBOL.code().raw());
    asset quantity = asset(quantity_amount, DAPPSERVICES_TOKEN_SYMBOL);
    local_accountstable.modify(itr, eosio::same_payer, [&](auto &r) {
      r.balance.amount += quantity_amount;
    });
  }

  void subtract_balance(name account, double quantity_amount) {
    accounts local_accountstable(_self,account.value);   
    const auto& destination_balance = local_accountstable.get(DAPPSERVICES_TOKEN_SYMBOL.code().raw(), "no destination balance found. please open an account with self");
    auto itr = local_accountstable.find(DAPPSERVICES_TOKEN_SYMBOL.code().raw());
    asset quantity = asset(quantity_amount, DAPPSERVICES_TOKEN_SYMBOL);
    local_accountstable.modify(itr, eosio::same_payer, [&](auto &r) {
        r.balance.amount -= quantity_amount;
    });
  }

  typedef eosio::singleton<"payouts"_n, payouts> payouts_def;
};