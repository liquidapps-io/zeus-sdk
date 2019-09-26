#pragma once

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
using namespace eosio;

using eosio::name;
using eosio::asset;
using eosio::action;
using eosio::permission_level;
using std::string;
using eosio::checksum256;
using eosio::symbol_code;

#include "dappservices.config.hpp"
extern "C" {
   struct __attribute__((aligned (16))) capi_checksum256 { uint8_t hash[32]; };

   __attribute__((eosio_wasm_import))
   void sha256( const char* data, uint32_t length, capi_checksum256* hash );

}
#define DAPPSERVICES_SYMBOL symbol(symbol_code("DAPP"), 4)
#define DAPPSERVICES_QUOTA_SYMBOL symbol(symbol_code("QUOTA"), 4)
#define EXPAND(...) __VA_ARGS__
#define XSTR(x) #x
#define STR(x) XSTR(x)
#define IDENT(x) x
#define EMPTYSEQ ()

#define EMIT_REQUEST_SVC_EVENT(payer, service, action, provider,             \
                               encodedData)                                    \
  START_EVENT("service_request", "1.0")                                      \
  EVENTKV("payer", payer)                                                      \
  EVENTKV("service", service)                                              \
  EVENTKV("action", action)                                                    \
  EVENTKV("provider", provider)                                                \
  EVENTKVL("data", encodedData)                           \
  END_EVENT()

#define EMIT_SIGNAL_SVC_EVENT(payer, service, action, provider, package, encodedData) \
  START_EVENT("service_signal", "1.1")                                       \
  EVENTKV("payer", payer)                                                      \
  EVENTKV("service", service)                                              \
  EVENTKV("action", action)                                                    \
  EVENTKV("provider", provider)                                                \
  EVENTKV("package", package)                                                \
  EVENTKVL("data", encodedData)                                                \
  END_EVENT()

#define SIGNAL_NAME(name) s##name
#define REQUEST_NAME(name) r##name

#define BUILD_FIELD(r, dummy, field)                                           \
  BOOST_PP_SEQ_ELEM(0, field) BOOST_PP_SEQ_ELEM(1, field);

#define POPULATE_FIELD(r, dummy, field)                                           \
  curr.BOOST_PP_SEQ_ELEM(1, field) = BOOST_PP_SEQ_ELEM(1, field);

#define DUMMY_MACRO _

#define BUILD_FIELDS(args) BOOST_PP_SEQ_FOR_EACH(BUILD_FIELD, DUMMY_MACRO, args)
#define POPULATE_FIELDS(args) BOOST_PP_SEQ_FOR_EACH(POPULATE_FIELD, DUMMY_MACRO, args)



#define BUILD_ARG(r, data, i, field)                                           \
  BOOST_PP_COMMA_IF(i) BOOST_PP_SEQ_ELEM(0, field) BOOST_PP_SEQ_ELEM(1, field)

#define BUILD_ARGS(args) BOOST_PP_SEQ_FOR_EACH_I(BUILD_ARG, DUMMY_MACRO, args)

#define TONAME(aname)                                                          \
  name { STR(aname) }

#define SIGNAL_T(aname, fields, service_contract)                                                \
  struct SIGNAL_NAME(aname) {                                                  \
    BUILD_FIELDS(fields)                                                       \
    static SIGNAL_NAME(aname) build(BUILD_ARGS(fields)) {                      \
      SIGNAL_NAME(aname) curr;                                                 \
      POPULATE_FIELDS(fields)                                                  \
      return curr;                                                             \
    }                                                                          \
    void send(name provider,name package)       {                      \
      signal_svc(service_contract, provider, package, *this);                           \
    }                                                                          \
  };

#define REQUEST_T(aname, fail_val, fields, service_contract)                                     \
  struct REQUEST_NAME(aname) {                                                 \
    BUILD_FIELDS(fields)                                                       \
    static REQUEST_NAME(aname) build(BUILD_ARGS(fields)) {                     \
      REQUEST_NAME(aname) curr;                                                \
      POPULATE_FIELDS(fields)                                                  \
      return curr;                                                             \
    }                                                                          \
    void send(name provider = ""_n) {                                          \
      request_svc(service_contract, provider, *this);                        \
    }                                                                          \
    bool fail = fail_val;                                                      \
  };

#define SEND_SVC_REQUEST_P(name, provider, ...)                                \
  REQUEST_NAME(name)::build(__VA_ARGS__).send(provider);

#define SEND_SVC_REQUEST(name, ...)                                            \
  REQUEST_NAME(name)::build(__VA_ARGS__).send(""_n);

#define SEND_SVC_SIGNAL(name, provider, package, ...)                                   \
  SIGNAL_NAME(name)::build(__VA_ARGS__).send(provider, package);


#define SVC_RESP_NAME(svc,name) \
    _##svc##_##name

#define SVC_RESP_X(svc,name) \
    void SVC_RESP_NAME(svc,name)

#define ACTION_NAME(name) x##name

#define SVC_ACTION_METHOD(aname, args)                                         \
 [[eosio::action]] void ACTION_NAME(aname)(name current_provider, name package, BUILD_ARGS(args))

#define SVC_ACTION_METHOD_NOC(aname, args)                                         \
 [[eosio::action]] void ACTION_NAME(aname)(BUILD_ARGS(args))

#define SVC_ACTION(aname, fail_val, request_fields, signal_fields,             \
                   action_args, service_contract)                                                \
  SIGNAL_T(aname, signal_fields, service_contract)                                               \
  REQUEST_T(aname, fail_val, request_fields, service_contract)                                   \
  static void signal_svc(name service, name provider,name package,                        \
                         SIGNAL_NAME(aname) signalData) {                      \
    name actionName = TONAME(aname);                                           \
    std::vector<char> raw = eosio::pack<SIGNAL_NAME(aname)>(signalData);       \
    action(permission_level{name(current_receiver()), "active"_n},             \
           name(current_receiver()), "xsignal"_n,                              \
           std::make_tuple(service, actionName, provider, package, raw))       \
        .send();                                                               \
  }                                                                            \
  static void request_svc(name service, name provider,                       \
                          REQUEST_NAME(aname) request) {                       \
    name actionName = TONAME(aname);                                           \
    std::vector<char> raw = eosio::pack<REQUEST_NAME(aname)>(request);         \
    string str(raw.begin(), raw.end());                                        \
    auto encodedData = fc::base64_encode(str);                                 \
    EMIT_REQUEST_SVC_EVENT(name(current_receiver()), service, actionName,      \
                           provider, encodedData.c_str());                     \
    if (request.fail)                                                          \
      eosio::check(false, "required service");                               \
  }                                                                            \
  SVC_ACTION_METHOD(aname, action_args)

#define typeName(TYPE) #TYPE

#ifndef USAGE_DEFINED
#define USAGE_DEFINED
struct usage_t {
  asset quantity;
  name provider;
  name payer;
  name service;
  name package;
  bool success = false;
};
#endif

#define XSIGNAL_DAPPSERVICE_ACTION \
    SVC_ACTION_METHOD_NOC(signal,((name)(service))((name)(action))((name)(provider))((name)(package))((std::vector<char>)(signalRawData))){ \
        require_recipient(DAPPSERVICES_CONTRACT);  \
    }

#define _CONVERT_TO_ACTION_NAME(r, contract, name)                             \
  EOSIO_DISPATCH_HELPER(contract, (ACTION_NAME(name)))

#define BUILD_ACTIONS_SVC_HELPER(contract, names)                              \
  BOOST_PP_SEQ_FOR_EACH(_CONVERT_TO_ACTION_NAME, contract, names)
#define STANDARD_USAGE_MODEL(signal)                                           \
  MODEL_START(signal) {                                                        \
    uint64_t cost_per_action;                                                  \
    usage_t calc_usage(name payer, name currentProvider,                       \
                       SIGNAL_NAME(signal) signalData) {                       \
      asset quantity;                                                          \
      quantity.amount = cost_per_action;                                       \
      quantity.symbol = DAPPSERVICES_QUOTA_SYMBOL;                                     \
      MODEL_RESULT(quantity);                                                  \
    }                                                                          \
  };

#define EOSIO_DISPATCH_SVC_TRX(contract, methods)    \
  extern "C" {                                                                 \
  void apply(uint64_t receiver, uint64_t code, uint64_t action) { \
    if (code != receiver && action == "transfer"_n.value) {                    \
      eosio::execute_action(eosio::name(receiver), eosio::name(code),          \
                            &contract::transfer);                              \
    }                                                                          \
    else {                                                    \
      switch (action) {                                                        \
        EOSIO_DISPATCH_HELPER(contract, DAPPSERVICE_ACTIONS_COMMANDS())              \
        EOSIO_DISPATCH_HELPER(contract, methods)                               \
        EOSIO_DISPATCH_HELPER(contract, (xsignal))                             \
      }                                                                        \
    }                                                                          \
    eosio_exit(0);                                                             \
  }                                                                            \
  }

#define EOSIO_DISPATCH_SVC(contract, methods)        \
  extern "C" {                                                                 \
  void apply(uint64_t receiver, uint64_t code, uint64_t action) { \
    if (code == receiver) {                                                    \
      switch (action) {                                                        \
        EOSIO_DISPATCH_HELPER(contract, methods)                               \
        EOSIO_DISPATCH_HELPER(contract, DAPPSERVICE_ACTIONS_COMMANDS())              \
        EOSIO_DISPATCH_HELPER(contract, (xsignal))                             \
      }                                                                        \
    }                                                                          \
    eosio_exit(0);                                                             \
  }                                                                            \
  }







#define HANDLECASE_SIGNAL_TYPE(signal)                                         \
  if (action == TONAME(signal)) {                                              \
    _xsignal_provider<SIGNAL_NAME(signal)>(                                    \
        action, provider,package,                                              \
        eosio::unpack<SIGNAL_NAME(signal)>(signalRawData));                    \
    return;                                                                    \
  }


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
      return (uint128_t{account.value}<<64) | service.value;
    }
    static checksum256 _by_account_service_provider(name account, name service,
                                                 name provider) {
      return checksum256::make_from_word_sequence<uint64_t>(
          0ULL, account.value, service.value, provider.value);
    }
  };

//MOVED TYPE DEFS TO CLASS

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

std::vector<name> getProvidersForAccount(name account, name service) {
  // get from service account
  accountexts_t accountexts(DAPPSERVICES_CONTRACT, DAPPSERVICES_SYMBOL.code().raw());
  auto idxKey =
    accountext::_by_account_service(account, service);
  auto cidx = accountexts.get_index<"byext"_n>();
  auto acct = cidx.find(idxKey);
  std::vector<name> result;
  while(acct != cidx.end()){
    if(acct->account != account || acct->service != service) return result;
    result.push_back(acct->provider);
    acct++;
  }
  return result;
}


void dispatchUsage(usage_t usage_report) {
  action(permission_level{name(current_receiver()), "active"_n},
         DAPPSERVICES_CONTRACT, "usage"_n, std::make_tuple(usage_report))
      .send();
}


#define DAPPSERVICE_PROVIDER_ACTIONS                                               \
  template <typename T>                                                        \
  void _xsignal_provider(name actionName, name provider,name package, T signalData) {       \
    auto payer = get_first_receiver();  \
    std::vector<name> providers;                                               \
    if (provider != ""_n)                                                      \
      providers.push_back(provider);                                           \
    else                                                                       \
      providers = getProvidersForAccount(payer, name(current_receiver()));     \
    require_auth(payer);                                                       \
    auto currentProvider = provider;                                            \
      providermodels_t providermodels(_self, currentProvider.value);           \
      auto providerModel = providermodels.find(package.value);      \
      eosio::check (providerModel != providermodels.end(), "package not found");\
      auto model = providerModel->model;                                        \
      auto usageResult = model.calc_usage(payer, currentProvider, signalData); \
      usageResult.provider = currentProvider;                                  \
      usageResult.payer = payer;                                               \
      usageResult.package = package;                                               \
      usageResult.service = name(current_receiver());                        \
      dispatchUsage(usageResult);                                              \
  }

#define DAPPSERVICE_PROVIDER_BASIC_ACTIONS                                       \
 [[eosio::action]] void regprovider(name provider, providermdl model) {                       \
    require_auth(provider);                                                    \
    providermodels_t providermodels(_self, provider.value);                    \
    auto providerModel = providermodels.find(model.package_id.value);                       \
    eosio::check(providerModel == providermodels.end(), "already exists");\
    providermodels.emplace(provider, [&](auto &s) {\
          s.model = model.model;\
          s.package_id = model.package_id;\
    });\
  }

#define EOSIO_DISPATCH_SVC_PROVIDER(contract)                                  \
  extern "C" {                                                                 \
  void apply(uint64_t receiver, uint64_t code, uint64_t action) { \
    if (code == receiver) {                                                    \
      switch (action) { EOSIO_DISPATCH_HELPER(contract, (regprovider)) }       \
    } else                                                                     \
      switch (action) {                                                        \
        EOSIO_DISPATCH_HELPER(contract, (ACTION_NAME(signal)))                 \
      }                                                                        \
    eosio_exit(0);                                                             \
  }                                                                            \
  }

#define HANDLE_MODEL_SIGNAL_FIELD(signal)                                      \
  signal##_model_t signal##_model_field;                                       \
  usage_t calc_usage(name payer, name provider,                                \
                     SIGNAL_NAME(signal) signalData) {                         \
    return signal##_model_field.calc_usage(payer, provider, signalData);       \
  }

#define MODEL_RESULT(quantity)                                                 \
  {                                                                            \
    usage_t usage_result;                                                      \
    usage_result.quantity = quantity;                                          \
    return usage_result;                                                       \
  }                                                                            \
  while (0)

#define MODEL_START(signal) struct signal##_model_t

#define HANDLE_MODEL_SIGNAL_FIELD2(signal)                                      \
  signal##_model_t signal##_model_field;
#define STANDARD_USAGE_MODEL2(signal)                                           \
  MODEL_START(signal) {                                                        \
    uint64_t cost_per_action;                                                  \
  };

#define CONTRACT_START() \
CONTRACT CONTRACT_NAME() : public eosio::contract { \
  using contract::contract; \
public: \
DAPPSERVICES_ACTIONS()

#define CONTRACT_END(methods) \
}; \
EOSIO_DISPATCH_SVC(CONTRACT_NAME(),methods)