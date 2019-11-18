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

CONTRACT dappservicex : public eosio::contract {
public:
  using contract::contract;


  TABLE dspentry {
    name allowed_dsp; // sisterchain account
    uint64_t primary_key()const { return allowed_dsp.value; }

  };
  typedef eosio::multi_index<"dspentries"_n, dspentry> dsps;

  TABLE accountlink {
    name mainnet_owner; // mainnet account, for both consumers and DSPs
  };
  typedef eosio::singleton<"accountlinks"_n, accountlink> accountlinks;
  TABLE setting {
    name chain_name;
    bool is_sister_chain;
  };
  typedef eosio::singleton<"settings"_n, setting> settings;
  [[eosio::action]] void setlink(name owner, name mainnet_owner) {
    require_auth(owner);
    accountlinks accountlink_table(_self, owner.value);
    accountlink link;
    link.mainnet_owner = mainnet_owner;
    accountlink_table.set(link, owner);
  }

  [[eosio::action]] void init(name chain_name, bool is_sister_chain) {
    require_auth(_self);
    settings settings_table(_self, _self.value);
    setting new_settings;
    new_settings.chain_name = chain_name;
    new_settings.is_sister_chain = is_sister_chain;
    settings_table.set(new_settings, _self);
  }
  // allow mainnet DSP
  [[eosio::action]] void adddsp(name owner, name dsp) {
    require_auth(owner);
    dsps dsptable(_self, owner.value);
    auto res = dsptable.find(dsp.value);
    eosio::check(res != dsptable.end(), "dsp already in table");
    dsptable.emplace(owner, [&](auto &a){
      a.allowed_dsp = dsp;
    });
  }

  // remove mainnet DSP
  [[eosio::action]] void rmvdsp(name owner, name dsp) {
    require_auth(owner);
    dsps dsptable(_self, owner.value);
    auto res = dsptable.find(dsp.value);
    eosio::check(res == dsptable.end(), "dsp not in table");
    dsptable.erase(res);
  }

  // for tracking
  [[eosio::action]] void xsignal(name service, name action, name provider, name package,
                 std::vector<char> signalRawData) {
    require_auth(get_first_receiver()); // from consumer contract
    string str(signalRawData.begin(), signalRawData.end());
    auto encodedData = fc::base64_encode(str);


    settings settings_table(_self, _self.value);
    setting current_settings =settings_table.get();

    dsps dsptable(_self, get_first_receiver().value);
    auto res = dsptable.find(provider.value);
    // eosio::check( res != dsptable.end(), "dsp not allowed");

    EMIT_SIGNAL_SVC_EVENT(name(get_first_receiver()), service, action, provider, package,
                          encodedData.c_str());
  }

  // for tracking
  [[eosio::action]] void xcallback(name provider, string request_id, string meta) {
    require_auth(provider);
    EMIT_CALLBACK_SVC_EVENT(provider, request_id, meta.c_str());
  }



};

extern "C" {
void apply(uint64_t receiver, uint64_t code, uint64_t action) {
  if (code == receiver) {
    switch (action) {
      EOSIO_DISPATCH_HELPER(dappservicex, (setlink)(xcallback)(adddsp)(rmvdsp)(init))
    }
  } else {
    switch (action) { EOSIO_DISPATCH_HELPER(dappservicex, (xsignal)) }
  }
  eosio_exit(0);
}
}
