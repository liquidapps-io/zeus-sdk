#include "./dappservices.hpp"
#include <cmath>
#include <eosiolib/eosio.hpp>
#include <eosiolib/transaction.hpp>
using namespace eosio;
using namespace std;

#define EMIT_USAGE_REPORT_EVENT(usageResult)                                   \
  START_EVENT("usage_report", "1.4")                                           \
  EVENTKV("payer", (usageResult).payer)                                        \
  EVENTKV("service", (usageResult).service)                                \
  EVENTKV("provider", (usageResult).provider)                                  \
  EVENTKV("quantity", (usageResult).quantity)                                  \
  EVENTKV("success", (usageResult).success)                                   \
  EVENTKVL("package", (usageResult).package)                                   \
  END_EVENT()

CONTRACT dappservices : public eosio::contract {
public:
  using contract::contract;
  TABLE account {
    asset balance;
    uint64_t primary_key() const { return balance.symbol.code().raw(); }
  };

  TABLE currency_stats {
    asset supply;
    asset max_supply;
    name issuer;
    uint64_t primary_key() const { return supply.symbol.code().raw(); }
  };

  TABLE currency_stats_ext {
    asset staked;
    double inflation_per_block;
    uint64_t last_inflation_ts;
    uint64_t primary_key() const { return staked.symbol.code().raw(); }
  };

  TABLE refundreq {
    uint64_t id;
    asset amount;
    name provider;
    name service;
    uint64_t unstake_time;
    uint64_t primary_key() const { return id; }
    checksum256 by_symbol_service_provider() const {
      return _by_symbol_service_provider(amount.symbol.code(), service,
                                           provider);
    }
    static checksum256 _by_symbol_service_provider(symbol_code symbolCode,
                                                name service, name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          0ULL, symbolCode.raw(), service.value, provider.value);
    }
  };

  TABLE package {
    uint64_t id;
    
    std::string api_endpoint;
    std::string package_json_uri;
    
    name package_id;
    name service;
    name provider;

    asset quota;
    uint32_t package_period;

    asset min_stake_quantity;
    uint32_t min_unstake_period; // commitment
    // uint32_t min_staking_period;
    bool enabled;

    uint64_t primary_key() const { return id; }
    checksum256 by_package_service_provider() const {
      return _by_package_service_provider(package_id, service, provider);
    }
    static checksum256 _by_package_service_provider(
        name package_id, name service, name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          0ULL, package_id.value, service.value, provider.value);
    }
  };

  TABLE reward {
    asset balance;
    uint64_t last_usage;
    
    asset total_staked; 
    uint64_t last_inflation_ts;
    uint64_t primary_key() const { return DAPPSERVICES_SYMBOL.code().raw(); }
  };

  TABLE accountext {
    uint64_t id;
    name account;
    name service;
    name provider;
    asset quota;
    asset balance;
    uint64_t last_usage;
    uint64_t last_reward;
    name package;
    name pending_package;
    uint64_t package_started;
    uint64_t package_end;
    uint64_t primary_key() const { return id; }
    checksum256 by_account_service_provider() const {
      return _by_account_service_provider(account, service, provider);
    }
    uint128_t by_account_service() const {
      return _by_account_service(account, service);
    }
    static uint128_t _by_account_service(name account, name service) {
      return ((uint128_t)account.value<<64) | service.value;
    }
    static checksum256 _by_account_service_provider(name account, name service,
                                                 name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          0ULL, account.value, service.value, provider.value);
    }
  };

  typedef eosio::multi_index<
      "refundreq"_n, refundreq,
      indexed_by<"byprov"_n,
                 const_mem_fun<refundreq, checksum256,
                               &refundreq::by_symbol_service_provider>>>
      refunds_table;

  typedef eosio::multi_index<
      "package"_n, package,
      indexed_by<"bypkg"_n,
                 const_mem_fun<package, checksum256,
                               &package::by_package_service_provider>>>
      packages_t;

  typedef eosio::multi_index<"stat"_n, currency_stats> stats;
  typedef eosio::multi_index<"statext"_n, currency_stats_ext> stats_ext;
  typedef eosio::multi_index<"accounts"_n, account> accounts;
  typedef eosio::multi_index<"reward"_n, reward> rewards_t;
  
  
  typedef eosio::multi_index<
      "accountext"_n, accountext,
      indexed_by<"byprov"_n,
                 const_mem_fun<accountext, checksum256,
                               &accountext::by_account_service_provider>>,
      indexed_by<"byext"_n,
                 const_mem_fun<accountext, uint128_t,
                               &accountext::by_account_service>>
                               >
      accountexts_t; 

  // token

 [[eosio::action]] void create(uint64_t maximum_supply_amount, double inflation_per_block, uint64_t inflation_starts_at) {
    require_auth(_self);
    eosio_assert(maximum_supply_amount > 0, "max-supply must be positive");
    auto issuer = _self;
    asset maximum_supply;
    auto sym = DAPPSERVICES_SYMBOL;
    maximum_supply.symbol = sym;
    maximum_supply.amount = maximum_supply_amount;

    stats statstable(_self, sym.code().raw());
    stats_ext statxstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    auto existingx = statxstable.find(sym.code().raw());
    eosio_assert(existing == statstable.end(),
                 "token with symbol already exists");
    eosio_assert(existingx == statxstable.end(),
                 "token with symbol already exists");

    statxstable.emplace(_self, [&](auto &s) {
      s.staked.symbol = maximum_supply.symbol;
      s.inflation_per_block = inflation_per_block;
      s.last_inflation_ts = inflation_starts_at;
    });
    statstable.emplace(_self, [&](auto &s) {
      s.supply.symbol = maximum_supply.symbol;
      s.max_supply = maximum_supply;
      s.issuer = issuer;
    });
  }
 [[eosio::action]] void regpkg(package newpackage) {
    require_auth(newpackage.provider);

    packages_t packages(_self, _self.value);
    auto idxKey = package::_by_package_service_provider(
        newpackage.package_id, newpackage.service, newpackage.provider);
    auto cidx = packages.get_index<"bypkg"_n>();
    auto existing = cidx.find(idxKey);
    eosio_assert(existing == cidx.end(), "already exists");

    eosio_assert(newpackage.quota.symbol == DAPPSERVICES_QUOTA_SYMBOL, "wrong symbol");

    packages.emplace(newpackage.provider, [&](package &r) {
      // start disabled.
      r.enabled = true;
      r.id = packages.available_primary_key();
      r.provider = newpackage.provider;
      r.service = newpackage.service;
      r.package_id = newpackage.package_id;
      r.quota = newpackage.quota;
      r.min_stake_quantity = newpackage.min_stake_quantity;
      r.min_unstake_period = newpackage.min_unstake_period;
      r.package_json_uri = newpackage.package_json_uri;
      r.api_endpoint = newpackage.api_endpoint;      
      // a.min_staking_period = newpackage.min_staking_period;
      r.package_period = newpackage.package_period;
    });
  }
  
  
 [[eosio::action]] void modifypkg(name provider, name package_id, name service, std::string api_endpoint, std::string package_json_uri) {
    require_auth(provider);

    packages_t packages(_self, _self.value);
    auto idxKey = package::_by_package_service_provider(
        package_id, service, provider);
    auto cidx = packages.get_index<"bypkg"_n>();
    auto existing = cidx.find(idxKey);
    eosio_assert(existing != cidx.end(), "missing package");
    cidx.modify(existing, eosio::same_payer, [&](package &r) {
      // start disabled.
      // r.enabled = true;
      // r.id = packages.available_primary_key();
      // r.provider = newpackage.provider;
      // r.service = newpackage.service;
      // r.package_id = newpackage.package_id;
      // r.quota = newpackage.quota;
      // r.min_stake_quantity = newpackage.min_stake_quantity;
      // r.min_unstake_period = newpackage.min_unstake_period;
      if(package_json_uri != "")
        r.package_json_uri = package_json_uri;
      if(api_endpoint != "")
        r.api_endpoint = api_endpoint;      
      // a.min_staking_period = newpackage.min_staking_period;
      // r.package_period = newpackage.package_period;
    });
  }
  //[[eosio::action]] void disablepkg(name service, name provider, name package_id) {
  //   packages_t packages(_self, _self.value);
  //   auto idxKey = package::_by_package_service_provider(package_id, service,
  //                                                         provider);
  //   auto cidx = packages.get_index<"bypkg"_n>();
  //   auto existing = cidx.find(idxKey);
  //   eosio_assert(existing != cidx.end(), "package must exist");
  //   eosio_assert(existing->enabled, "already disabled");
  //   cidx.modify(existing, eosio::same_payer,
  //               [&](package &r) { r.enabled = false; });
  // }
  //[[eosio::action]] void enablepkg(name service, name provider, name package_id) {
  //   packages_t packages(_self, _self.value);
  //   auto idxKey = package::_by_package_service_provider(package_id, service,
  //                                                         provider);
  //   auto cidx = packages.get_index<"bypkg"_n>();
  //   auto existing = cidx.find(idxKey);
  //   eosio_assert(existing != cidx.end(), "package must exist");
  //   eosio_assert(!existing->enabled, "already enabled");
  //   cidx.modify(existing, eosio::same_payer,
  //               [&](package &r) { r.enabled = true; });
  // }

 [[eosio::action]] void issue(name to, asset quantity, string memo) {
    auto sym = quantity.symbol;
    eosio_assert(sym.is_valid(), "invalid symbol name");
    eosio_assert(memo.size() <= 256, "memo has more than 256 bytes");

    auto sym_name = sym.code().raw();
    stats statstable(_self, sym_name);
    auto existing = statstable.find(sym_name);
    eosio_assert(existing != statstable.end(),
                 "token with symbol does not exist, create token before issue");
    const auto &st = *existing;
    require_auth(st.issuer);
    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must issue positive quantity");

    eosio_assert(quantity.symbol == st.supply.symbol,
                 "symbol precision mismatch");
    eosio_assert(quantity.amount <= st.max_supply.amount - st.supply.amount,
                 "quantity exceeds available supply");

    statstable.modify(st, eosio::same_payer,
                      [&](auto &s) { s.supply += quantity; });

    add_balance(st.issuer, quantity, st.issuer);
    applyInflation();
    if (to != st.issuer) {
      action(permission_level{st.issuer, "active"_n}, _self, "transfer"_n,
             std::make_tuple(st.issuer, to, quantity, memo))
          .send();
    }
  }
 [[eosio::action]] void retire(asset quantity, string memo) {

    auto sym = quantity.symbol;
    eosio_assert(sym.is_valid(), "invalid symbol name");
    eosio_assert(memo.size() <= 256, "memo has more than 256 bytes");

    auto sym_name = sym.code().raw();
    stats statstable(_self, sym_name);
    auto existing = statstable.find(sym_name);
    eosio_assert(existing != statstable.end(),
                 "token with symbol does not exist");
    const auto &st = *existing;
    require_auth(st.issuer);
    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must retire positive quantity");

    eosio_assert(quantity.symbol == st.supply.symbol,
                 "symbol precision mismatch");

    statstable.modify(st, eosio::same_payer,
                      [&](auto &s) { s.supply -= quantity; });
    sub_balance(st.issuer, quantity);
  }

 [[eosio::action]] void transfer(name from, name to, asset quantity, string memo) {
    eosio_assert(from != to, "cannot transfer to self");
    require_auth(from);
    eosio_assert(is_account(to), "to account does not exist");
    auto sym = quantity.symbol.code().raw();
    stats statstable(_self, sym);
    const auto &st = statstable.get(sym);

    require_recipient(from);
    require_recipient(to);

    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must transfer positive quantity");
    eosio_assert(quantity.symbol == st.supply.symbol,
                 "symbol precision mismatch");
    eosio_assert(memo.size() <= 256, "memo has more than 256 bytes");

    auto payer = has_auth(to) ? to : from;
    applyInflation();
    sub_balance(from, quantity);
    add_balance(to, quantity, payer);
  }

 [[eosio::action]] void open(name owner, symbol_code symbol, name ram_payer) {
    require_auth(ram_payer);
    auto sym = symbol.raw();

    stats statstable(_self, sym);
    const auto &st = statstable.get(sym, "symbol does not exist");
    eosio_assert(st.supply.symbol.code().raw() == sym,
                 "symbol precision mismatch");

    accounts acnts(_self, owner.value);
    auto it = acnts.find(sym);
    if (it == acnts.end()) {
      acnts.emplace(ram_payer, [&](auto &a) {
        a.balance = asset{0, st.supply.symbol};
      });
    }
  }
 [[eosio::action]] void close(name owner, symbol_code symbol) {
    require_auth(owner);
    accounts acnts(_self, owner.value);
    auto it = acnts.find(symbol.raw());
    eosio_assert(it != acnts.end(), "Balance row already deleted or never "
                                    "existed. Action won't have any effect.");
    eosio_assert(it->balance.amount == 0,
                 "Cannot close because the balance is not zero.");
    acnts.erase(it);
  }

 [[eosio::action]] void closeprv(name owner, name service, name provider) {
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(owner, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);
    eosio_assert(acct != cidx.end(), "Balance row already deleted or never "
                                    "existed. Action won't have any effect.");
    eosio_assert(acct->balance.amount == 0,
                 "Cannot close because the balance is not zero.");
    cidx.erase(acct);
  }
  static asset get_supply(name token_contract_account, symbol_code sym) {
    stats statstable(token_contract_account, sym.raw());
    const auto &st = statstable.get(sym.raw());
    return st.supply;
  }

  static asset get_balance(name token_contract_account, name owner,
                           symbol_code sym) {
    accounts accountstable(token_contract_account, owner.value);
    const auto &ac = accountstable.get(sym.raw());
    return ac.balance;
  }

 [[eosio::action]] void xsignal(name service, name action, name provider, name package,
                 std::vector<char> signalRawData) {
    require_auth(_code);
    string str(signalRawData.begin(), signalRawData.end());
    auto encodedData = fc::base64_encode(str);                                 
    EMIT_SIGNAL_SVC_EVENT(name(_code), service, action, provider, package,
                          encodedData.c_str());
    require_recipient(service);
    require_recipient(provider);
  }

 [[eosio::action]] void selectpkg(name owner, name provider, name service, name package) {
    require_auth(owner);
    choose_package(owner, service, provider, package);
    require_recipient(provider);
  }

 [[eosio::action]] void stake(name from, name provider, name service, asset quantity) {
    require_auth(from);
    require_recipient(provider);
    require_recipient(service);
    dist_rewards(from, provider, service);
    add_provider_balance(from, service, provider, quantity);
    sub_balance(from, quantity);
    add_total_staked(quantity);
  }

 [[eosio::action]] void unstake(name to, name provider, name service, asset quantity) {
    require_auth(to);
    require_recipient(provider);
    require_recipient(service);
    dist_rewards(to, provider, service);
    auto current_time_ms = current_time() / 1000;
    uint64_t unstake_time = current_time_ms + getUnstakeRemaining(to,provider,service);
    
    // set account->provider->service->unstake_time

    refunds_table refunds_tbl(_self, to.value);
    auto idxKey = refundreq::_by_symbol_service_provider(
        quantity.symbol.code(), service, provider);
    auto cidx = refunds_tbl.get_index<"byprov"_n>();
    auto req = cidx.find(idxKey);
    if (req != cidx.end()) {
      cidx.modify(req, eosio::same_payer, [&](refundreq &r) {
        r.unstake_time = unstake_time;
        r.amount += quantity;
      });
    } else {
      refunds_tbl.emplace(to, [&](refundreq &r) {
        r.id = refunds_tbl.available_primary_key();
        r.unstake_time = unstake_time;
        r.amount = quantity;
        r.provider = provider;
        r.service = service;
      });
    }
    uint64_t secondsLeft = 
        (unstake_time - current_time_ms) / 1000; // calc how much left
    if(unstake_time < current_time_ms || secondsLeft == 0)
      secondsLeft = 1;
    scheduleRefund(secondsLeft, to, provider, service, quantity.symbol.code());
  }

 [[eosio::action]] void refund(name to, name provider, name service, symbol_code symcode) {
    require_recipient(provider);
    require_recipient(service);
    auto current_time_ms = current_time() / 1000;
    refunds_table refunds_tbl(_self, to.value);
    auto idxKey =
        refundreq::_by_symbol_service_provider(symcode, service, provider);
    auto cidx = refunds_tbl.get_index<"byprov"_n>();
    auto req = cidx.find(idxKey);
    eosio_assert(req != cidx.end(), "refund request not found");
    dist_rewards(to, provider, service);
    uint64_t secondsLeft = 
        (req->unstake_time - current_time_ms) / 1000; // calc how much left
    if(req->unstake_time < current_time_ms)
      secondsLeft = 0;
    if (secondsLeft > 0) {
      scheduleRefund(secondsLeft, to, provider, service, symcode);
      return;
    }

    auto quantity = req->amount;
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKeyAcct =
        accountext::_by_account_service_provider(to, service, provider);
    auto cidxacct = accountexts.get_index<"byprov"_n>();
    auto acct = cidxacct.find(idxKeyAcct);
    if(acct != cidxacct.end()){
      if(quantity > acct->balance)
        quantity = acct->balance;
      sub_provider_balance(to, service, provider, quantity);
      sub_total_staked(quantity);
      add_balance(to, quantity, to);
    }
    cidx.erase(req);
  }

 [[eosio::action]] void usage(usage_t usage_report) {
    require_auth(usage_report.service);
    auto payer = usage_report.payer;
    auto service = usage_report.service;
    auto provider = usage_report.provider;
    auto quantity = usage_report.quantity;
    auto package = usage_report.package;
    require_recipient(provider);
    require_recipient(service);
    require_recipient(payer);
    
    usage_report.success = usequota(payer, provider, service, quantity);
    EMIT_USAGE_REPORT_EVENT(usage_report);
  }

 [[eosio::action]] void claimrewards(name provider) {
    require_auth(provider);
    auto current_time_ms = current_time() / 1000;
    rewards_t rewards(_self, provider.value);
    auto reward = rewards.find(DAPPSERVICES_SYMBOL.code().raw());
    eosio_assert(reward != rewards.end(), "no pending rewards");
    auto min_interval = 24 * 60 * 60 * 1000;
    eosio_assert(reward->last_usage + min_interval < current_time_ms, "already claimed in the last 24h");
    asset rewardAsset;
    rewards.modify(reward, eosio::same_payer, [&](auto &a) {
      rewardAsset = a.balance;
      a.last_usage = current_time_ms;
      // read + modify rewards (reset)
      a.balance -= rewardAsset;
    });
    // increase balance for self
    add_balance(_self, rewardAsset, _self);
    
    action(permission_level{_self, "active"_n}, _self, "transfer"_n,
           std::make_tuple(_self, provider, rewardAsset, std::string("rewards")))
        .send();
  }

private:
  inline void sub_total_staked(asset quantity) {
    stats_ext statsexts(_self, quantity.symbol.code().raw());
    auto existing = statsexts.find(quantity.symbol.code().raw());
    eosio_assert(existing != statsexts.end(),
                 "token with symbol does not exist");
    const auto &st = *existing;
    eosio_assert(quantity.amount > 0, "must unstake positive quantity");
    eosio_assert(quantity.amount <= st.staked.amount,
                 "quantity exceeds available supply");
    statsexts.modify(st, eosio::same_payer,
                     [&](auto &s) { s.staked -= quantity; });
  }

  inline void add_total_staked(asset quantity) {
    stats_ext statsexts(_self, quantity.symbol.code().raw());
    auto existing = statsexts.find(quantity.symbol.code().raw());
    eosio_assert(existing != statsexts.end(),
                 "token with symbol does not exist");
    const auto &st = *existing;
    eosio_assert(quantity.amount > 0, "must stake positive quantity");
    statsexts.modify(st, eosio::same_payer,
                     [&](auto &s) { s.staked += quantity; });
  }
  void sub_balance(name owner, asset quantity) {
    accounts from_acnts(_self, owner.value);

    const auto &from =
        from_acnts.get(quantity.symbol.code().raw(), "no balance object found");
    eosio_assert(from.balance.amount >= quantity.amount, "overdrawn balance");

    from_acnts.modify(from, owner, [&](auto &a) { a.balance -= quantity; });
  }

  void sub_provider_balance(name owner, name service, name provider,
                            asset quantity) {
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(owner, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);
    eosio_assert(acct != cidx.end(), "no balance object for provider");
    eosio_assert(acct->balance >= quantity, "overdrawn balance");

    cidx.modify(acct, eosio::same_payer,
                [&](auto &a) { a.balance -= quantity; });
                
    auto current_time_ms = current_time() / 1000;
    rewards_t rewards(_self, provider.value);
    auto reward = rewards.find(DAPPSERVICES_SYMBOL.code().raw());
    eosio_assert(reward != rewards.end(), "provider not found");
    rewards.modify(reward, _self, [&](auto &a) { 
      a.total_staked -= quantity; 
    });
  }
  
  void add_provider_balance(name owner, name service, name provider,
                            asset quantity) {
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(owner, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);

    eosio_assert(acct != cidx.end(), "must choose package first");

    cidx.modify(acct, eosio::same_payer,
                [&](auto &a) { a.balance += quantity; });
                
    auto current_time_ms = current_time() / 1000;
    rewards_t rewards(_self, provider.value);
    auto reward = rewards.find(DAPPSERVICES_SYMBOL.code().raw());
    if (reward != rewards.end()) {
      rewards.modify(reward, _self, [&](auto &a) { 
        a.total_staked += quantity;
      });
    } else {
      rewards.emplace(_self, [&](auto &a) { 
        a.total_staked = quantity; 
        a.last_inflation_ts = current_time_ms;
        a.balance.symbol = quantity.symbol;
      });
    }

  }
  void choose_package(name owner, name service, name provider, name package) {
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(owner, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);
    if (acct != cidx.end()) {
      cidx.modify(acct, eosio::same_payer,
                  [&](auto &a) { a.pending_package = package; });
      return;
    }
    accountexts.emplace(owner, [&](auto &a) { 
      a.id = accountexts.available_primary_key();
      a.pending_package = package; 
      a.provider = provider;
      a.service = service;
      a.account = owner;
      a.balance.symbol = DAPPSERVICES_SYMBOL;
      a.quota.symbol = DAPPSERVICES_QUOTA_SYMBOL;
    });

  }
  bool sub_quota(name owner, name service, name provider, asset quantity) {
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(owner, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();

    auto acct = cidx.find(idxKey);
    eosio_assert(acct != cidx.end(), "no quota for this provider");
    eosio_assert(acct->quota >= quantity, "not enough quota for this provider");
    auto newQuantity = acct->quota;
    if(acct->quota < quantity){
        return false;
    }
    cidx.modify(acct, eosio::same_payer, [&](auto &a) { a.quota -= quantity; });
    return true;
  }
  void add_quota(name owner, name service, name provider, asset quantity) {
    // set account->provider->service->last_quota
    accountexts_t accountexts(_self, DAPPSERVICES_SYMBOL.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(owner, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);
    eosio_assert(acct != cidx.end(), "must choose package first");
    cidx.modify(acct, eosio::same_payer, [&](auto &a) { a.quota += quantity; });
  }

  void add_balance(name owner, asset quantity, name ram_payer) {
    accounts to_acnts(_self, owner.value);
    auto to = to_acnts.find(quantity.symbol.code().raw());
    if (to == to_acnts.end()) {
      to_acnts.emplace(ram_payer, [&](auto &a) { a.balance = quantity; });
    } else {
      to_acnts.modify(to, eosio::same_payer,
                      [&](auto &a) { a.balance += quantity; });
    }
  }

  void scheduleRefund(uint32_t seconds, name to, name provider, name service,
                      symbol_code symcode) {
    using namespace eosio;
    auto trx = transaction();
    trx.actions.emplace_back(
        std::vector<permission_level>{{name(current_receiver()), "active"_n}},
        _self, "refund"_n, std::make_tuple(to, provider, service, symcode));
    trx.delay_sec = seconds;
    cancel_deferred(to.value);
    trx.send(to.value, _self, true);
  }
  void applyInflation() {
    auto sym = DAPPSERVICES_SYMBOL;
    stats_ext statsexts(_self, sym.code().raw());
    stats statstable(_self, sym.code().raw());
    auto existingx = statsexts.find(sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    eosio_assert(existingx != statsexts.end(),
                 "token with symbol does not exist");
    eosio_assert(existing != statstable.end(),
                 "token with symbol does not exist");
    const auto &stx = *existingx;
    const auto &st = *existing;
    double inflation = stx.inflation_per_block;
    
    auto current_time_ms = current_time() / 1000;
    
    uint64_t last_inflation_ts = stx.last_inflation_ts;
    
    if(current_time_ms <= last_inflation_ts + 500)
      return;
  
    int64_t passed_blocks = (current_time_ms - last_inflation_ts) / 500;
    if(passed_blocks <= 0)
      return;

    
    // calc global inflation
    double total_inflation_amount = (pow(1.0 + inflation, passed_blocks) - 1.0) * st.supply.amount;
    asset inflation_asset;
    inflation_asset.symbol = sym;
    inflation_asset.amount = total_inflation_amount;
    if(inflation_asset.amount <= 0)
      return;
    
    // increase supply
    statstable.modify(st, eosio::same_payer,
                      [&](auto &s) { 
                        s.supply += inflation_asset; 
                      });
    // save last inflation point
    statsexts.modify(stx, eosio::same_payer,
                      [&](auto &s) { 
                        s.last_inflation_ts = current_time_ms;
                      });
  }
  uint64_t getUnstakeRemaining(name payer, name provider, name service) {

    auto sym = DAPPSERVICES_SYMBOL;
    auto current_time_ms = current_time() / 1000;
    accountexts_t accountexts(_self, sym.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(payer, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);
    if (acct == cidx.end())
      return 0;
    accountext &acctr = (accountext &)*acct;
    if (acctr.package == ""_n)
      return 0;
    auto res = acctr.package_end - current_time_ms;
    if (res < 0)
      res = 0;

    packages_t packages(_self, _self.value);
    auto idxKeyPkg = package::_by_package_service_provider(
        acctr.package, service, provider);
    auto cidxPkg = packages.get_index<"bypkg"_n>();
    auto existingPkg = cidxPkg.find(idxKeyPkg);
    if (existingPkg == cidxPkg.end())
      return res;

    // min notice
    if (existingPkg->min_unstake_period > res)
      res = existingPkg->min_unstake_period * 1000;

    // todo: min commitment (mark package first start)
    // if(existingPkg->min_staking_period > res)

    return res;
  }
  void refillPackage(name payer, name provider, name service,
                     accountext & acct) {
    auto current_time_ms = current_time() / 1000;
    if (acct.package_end > current_time_ms) // not expired yet
      return;

    auto currentPackage = acct.package;
    acct.package_started = current_time_ms;
    acct.quota.amount = 0;
    acct.package = ""_n;
    acct.package_end = acct.package_started;

    if (acct.pending_package == ""_n)
      return; // no pending - reset quota

    // get package details
    packages_t packages(_self, _self.value);
    auto idxKey = package::_by_package_service_provider(acct.pending_package,
                                                          service, provider);
    auto cidx = packages.get_index<"bypkg"_n>();
    auto existing = cidx.find(idxKey);
    if (existing == cidx.end())
      return;
    auto newpackage = *existing;

    if (newpackage.min_stake_quantity > acct.balance) // doesn't meet min stake
      return;

    acct.quota.amount = newpackage.quota.amount;
    acct.package = acct.pending_package;
    acct.package_end =
        acct.package_started + (newpackage.package_period * 1000);
  }
  void dist_rewards(name payer, name provider, name service) {
    applyInflation();
    auto current_time_ms = (current_time() / 1000);
    // set last_block
    rewards_t rewards(_self, provider.value);
    auto reward = rewards.find(DAPPSERVICES_SYMBOL.code().raw());
    auto sym = DAPPSERVICES_SYMBOL;
    accountexts_t accountexts(_self, sym.code().raw());
    auto idxKey =
        accountext::_by_account_service_provider(payer, service, provider);
    auto cidx = accountexts.get_index<"byprov"_n>();
    auto acct = cidx.find(idxKey);
    if (acct == cidx.end())
      return;
    
    accountext &acctr = (accountext &)*acct;
    auto current_stake = acctr.balance.amount;
    refillPackage(payer, provider, service, acctr);
    if(reward != rewards.end()){
      // calculate reward
      double amount = 0.0;
      
      stats_ext statsexts(_self, sym.code().raw());
      auto existingx = statsexts.find(sym.code().raw());
      eosio_assert(existingx != statsexts.end(),
                 "token with symbol does not exist");
      const auto &stx = *existingx;
      
      double inflation = stx.inflation_per_block;
      int64_t passed_blocks = (current_time_ms - reward->last_inflation_ts) / 500;
      if(passed_blocks > 0){
        auto current_stake = reward->total_staked.amount;
        stats statstable(_self, sym.code().raw());
        auto existing = statstable.find(sym.code().raw());
        eosio_assert(existing != statstable.end(),
                     "token with symbol does not exist");
        const auto &st = *existing;
        auto totalStakeFactor = (1.0 * st.supply.amount) / stx.staked.amount;
        amount = (pow(1.0 + inflation, passed_blocks) - 1.0) * (current_stake*totalStakeFactor);
      }
      
      asset quantity;
      quantity.symbol = DAPPSERVICES_SYMBOL;
      quantity.amount = amount;
      if(quantity.amount > 0){
        acctr.last_reward = current_time_ms;
        giveRewards(provider, service, quantity);
      }
        
       
    }
    cidx.modify(acct, eosio::same_payer, [&](auto &a) {
      a.quota = acctr.quota;
      a.package_started = acctr.package_started;
      a.package = acctr.package;
      a.package_end = acctr.package_end;
      a.last_reward = acctr.last_reward;
      a.last_usage = current_time_ms;
    });
  }

  void giveRewards(name provider, name service, asset quantity) {
    auto sym = DAPPSERVICES_SYMBOL;
    auto current_time_ms = (current_time() / 1000);
    
    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    
    eosio_assert(existing != statstable.end(),
                 "token with symbol does not exist, create token before issue");
    const auto &st = *existing;
    eosio_assert(quantity.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "must issue positive quantity");

    eosio_assert(quantity.symbol == st.supply.symbol,
                 "symbol precision mismatch");
    eosio_assert(quantity.amount <= st.max_supply.amount - st.supply.amount,
                 "quantity exceeds available supply");

    
    rewards_t rewards(_self, provider.value);
    auto reward = rewards.find(DAPPSERVICES_SYMBOL.code().raw());
    if (reward != rewards.end()) {
      rewards.modify(reward, _self, [&](auto &a) { 
        a.balance += quantity; 
        a.last_inflation_ts = current_time_ms;
      });
    } else {
      rewards.emplace(_self, [&](auto &a) { 
        a.balance = quantity;
        a.last_inflation_ts = current_time_ms;
      });
    }
  }

  bool usequota(name payer, name provider, name service, asset quantity) {
    dist_rewards(payer, provider, service);
    return sub_quota(payer, service, provider, quantity);
  }

  const currency_stats &getSymbolStats(symbol sym) {
    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    eosio_assert(sym.is_valid(), "invalid symbol name");
    eosio_assert(existing != statstable.end(),
                 "token with symbol does not exist");
    return *existing;
  }
};

extern "C" {
[[noreturn]] void apply(uint64_t receiver, uint64_t code, uint64_t action) {
  if (code == receiver) {
    switch (action) {
      EOSIO_DISPATCH_HELPER(
          dappservices, (usage)(stake)(unstake)(refund)(claimrewards)(create)(
                          issue)(transfer)(open)(close)(retire)(selectpkg)(
                          regpkg)(closeprv)(modifypkg))
    }
  } else {
    switch (action) { EOSIO_DISPATCH_HELPER(dappservices, (xsignal)) }
  }
  eosio_exit(0);
}
}
