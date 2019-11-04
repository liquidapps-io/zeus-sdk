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
// #define MIGRATION_MODE true

#define EMIT_USAGE_REPORT_EVENT(usageResult)                                   \
  START_EVENT("usage_report", "1.4")                                           \
  EVENTKV("payer", (usageResult).payer)                                        \
  EVENTKV("service", (usageResult).service)                                \
  EVENTKV("provider", (usageResult).provider)                                  \
  EVENTKV("quantity", (usageResult).quantity)                                  \
  EVENTKV("success", (usageResult).success)                                   \
  EVENTKVL("package", (usageResult).package)                                   \
  END_EVENT()


#define EMIT_CALLBACK_SVC_EVENT(provider, request_id, meta)                                   \
  START_EVENT("callback_report", "1.4")                                           \
  EVENTKV("provider", provider)                                        \
  EVENTKV("request_id", request_id)                                        \
  EVENTKVL("meta", meta)                                   \
  END_EVENT()


CONTRACT liquidx : public eosio::contract {
public:
  using contract::contract;

  const name HODL_ACCOUNT = "dappairhodl1"_n;


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

  //START THIRD PARTY STAKING MODS
  TABLE refundreq {
    uint64_t id;
    name account; //ADDED: account that was staked to
    asset amount;
    name provider;
    name service;
    uint64_t unstake_time;
    uint64_t primary_key() const { return id; }
    checksum256 by_symbol_service_provider() const {
      return _by_symbol_service_provider(amount.symbol.code(), account, service,
                                           provider);
    }
    static checksum256 _by_symbol_service_provider(symbol_code symbolCode,
                                  name account, name service, name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          symbolCode.raw(), account.value, service.value, provider.value);
    }
  };


  //we will scope to the payer/thirdparty
  TABLE staking {
    uint64_t id;            //id to ensure uniqueness

    name account;           //account that was staked to
    asset balance;
    name provider;
    name service;

    uint64_t primary_key() const { return id; }

    checksum256 by_account_service_provider() const {
      return _by_account_service_provider(account, service, provider);
    }
    static checksum256 _by_account_service_provider(name account,
                                                name service, name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          0ULL, account.value, service.value, provider.value);
    }
  };
  //END THIRD PARTY STAKING MODS

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
;

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
      return (uint128_t{account.value}<<64) | service.value;
    }
    static checksum256 _by_account_service_provider(name account, name service,
                                                 name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          0ULL, account.value, service.value, provider.value);
    }
  };

  //scope to accountext id
  TABLE stakingext {
    name payer;
    uint64_t primary_key() const { return payer.value; }
  };

  //ADDING TYPE DEFS


  typedef eosio::multi_index<
      "refunds"_n, refundreq,
      indexed_by<"byprov"_n,
                 const_mem_fun<refundreq, checksum256,
                               &refundreq::by_symbol_service_provider>
                >
      >
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
  typedef eosio::multi_index<"stakingext"_n, stakingext> staking_ext_t;





 [[eosio::action]] void unstake(name to, name provider, name service, asset quantity) {
  }

};

