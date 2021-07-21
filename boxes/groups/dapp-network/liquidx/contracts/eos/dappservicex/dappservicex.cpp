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

#define DAPPSERVICES_QUOTA_SYMBOL symbol(symbol_code("QUOTA"), 4)
#define DAPPSERVICES_QUOTA_COST 1

// #ifndef USAGE_DEFINED
// #define USAGE_DEFINED
// struct usage_t {
//   asset quantity;
//   name provider;
//   name payer;
//   name service;
//   name package;
//   bool success = false;
// };
// #endif

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

  struct usage_t {
    asset quantity;
    name provider;
    name payer;
    name service;
    name package;
    bool success = false;
  };

  struct pricing {
    name action;
    uint64_t cost_per_action;
  };

  TABLE package {
    name package_id;
    std::vector<pricing> pricing;
    uint64_t primary_key()const { return package_id.value; }
  };
  typedef eosio::multi_index<"package"_n, package> packages_t;

  TABLE dspentry {
    name allowed_dsp; // sisterchain account
    uint64_t primary_key()const { return allowed_dsp.value; }

  };
  typedef eosio::multi_index<"dspentries"_n, dspentry> dsps;

  TABLE accountlink {
    name mainnet_owner; // mainnet account, for both consumers and DSPs
  };
  typedef eosio::singleton<"accountlink"_n, accountlink> accountlinks;

  TABLE setting {
    name chain_name; // owner account on mainnet
  };
  typedef eosio::singleton<"settings"_n, setting> settings;

  [[eosio::action]] void setlink(name owner, name mainnet_owner) {
    require_auth(owner);
    accountlinks accountlink_table(_self, owner.value);
    accountlink link;
    link.mainnet_owner = mainnet_owner;
    accountlink_table.set(link, owner);
  }

  [[eosio::action]] void init(name chain_name) {
    require_auth(_self);
    settings settings_table(_self, _self.value);
    setting new_settings;
    new_settings.chain_name = chain_name;
    settings_table.set(new_settings, _self);
  }
  // allow mainnet DSP
  [[eosio::action]] void adddsp(name owner, name dsp) {
    require_auth(owner);
    dsps dsptable(_self, owner.value);
    auto res = dsptable.find(dsp.value);
    eosio::check(res == dsptable.end(), "dsp already in table");
    dsptable.emplace(owner, [&](auto &a){
      a.allowed_dsp = dsp;
    });
  }

  // remove mainnet DSP
  [[eosio::action]] void rmvdsp(name owner, name dsp) {
    require_auth(owner);
    dsps dsptable(_self, owner.value);
    auto res = dsptable.find(dsp.value);
    eosio::check(res != dsptable.end(), "dsp not in table");
    dsptable.erase(res);
  }

  [[eosio::action]] void pricepkg(name provider, name package_id, name action, uint64_t cost) {
    require_auth(provider);
    packages_t packages(_self, provider.value);
    auto existing = packages.find(package_id.value);
    if(existing != packages.end()) {
      auto prices = existing->pricing;
      auto itr = prices.begin();
      while(itr != prices.end()) {
        if(itr->action == action) {
          if(cost == 0) {
            prices.erase(itr);
          } else {
            *(itr) = pricing{action,cost};
          }
          break;
        }
        itr++;
      }
      packages.modify(existing, eosio::same_payer, [&](auto &p) {
        p.pricing = prices;
      });
    } else {
      if(cost == 0) return;
      packages.emplace(provider, [&](auto &p) {
        p.package_id = package_id;
        p.pricing.push_back(pricing{action,cost});
      });
    }
  }

  // for tracking
  [[eosio::action]] void xsignal(name service, name action, name provider, name package,
                 std::vector<char> signalRawData) {
    require_auth(get_first_receiver()); // from consumer contract
    string str(signalRawData.begin(), signalRawData.end());
    auto encodedData = fc::base64_encode(str);

    dsps dsptable(_self, get_first_receiver().value);
    auto res = dsptable.find(provider.value);
    eosio::check( res != dsptable.end(), "dsp not allowed");

    require_recipient(provider);
    calculateUsage(service,action,provider,package,signalRawData);
    EMIT_SIGNAL_SVC_EVENT(name(get_first_receiver()), service, action, provider, package,
                          encodedData.c_str());
  }

  // for tracking
  [[eosio::action]] void xcallback(name provider, string request_id, string meta) {
    require_auth(provider);
    EMIT_CALLBACK_SVC_EVENT(provider, request_id, meta.c_str());
  }

  TABLE lastlog {
    std::vector<usage_t> usage_reports;
  };
  typedef eosio::singleton<"lastlog"_n, lastlog> lastlog_t;

  [[eosio::action]] void xfail() {
    lastlog_t lastlog_singleton(_self,_self.value);
    string assertion_message;
    if(lastlog_singleton.exists()){
      auto lastlog_inst = lastlog_singleton.get();
      auto it = lastlog_inst.usage_reports.begin();
      while(it != lastlog_inst.usage_reports.end()) {
        EMIT_USAGE_REPORT_EVENT(*it);
        string success = it->success?"true":"false";
        assertion_message += std::string("{'version':'1.4','etype':'usage_report','payer':'") + (*it).payer.to_string() + std::string("','service':'") + (*it).service.to_string() + std::string("','provider':'") + (*it).provider.to_string() + std::string("','quantity':'") + (*it).quantity.to_string() + std::string("','success':'") + success + std::string("','package':'") + (*it).package.to_string() + std::string("'}\n");
        ++it;
      }
      lastlog_singleton.remove();      
    }
    eosio::check( false, assertion_message);
  }

 [[eosio::action]] void usage(usage_t usage_report) {
    require_auth(_self);
    auto payer = usage_report.payer;
    auto service = usage_report.service;
    auto provider = usage_report.provider;
    auto quantity = usage_report.quantity;
    auto package = usage_report.package;
    require_recipient(provider);
    require_recipient(payer);

    usage_report.success = true;
    if(shouldFail()){
      lastlog_t lastlog_singleton(_self,_self.value);
      auto lastlog_inst = lastlog_singleton.get_or_default();
      lastlog_inst.usage_reports.push_back(usage_report);
      lastlog_singleton.set(lastlog_inst, _self);       
      // append log
    }
    EMIT_USAGE_REPORT_EVENT(usage_report);
  }

private: 

  bool shouldFail() {
    auto size = transaction_size();
    char buf[size];
    uint32_t read = read_transaction( buf, size );
    check( size == read, "read_transaction failed");
    auto tx = unpack<transaction>(buf, size);
    //check last action
    auto last = tx.actions.rbegin();
    if(last != tx.actions.rend()) {
      if(last->account == name(get_self()) && last->name == "xfail"_n) return true;      
    }
    return false;
  }

  void dispatchUsage(usage_t usage_report) {
    action(permission_level{_self, "active"_n},
          _self, "usage"_n, std::make_tuple(usage_report))
        .send();
  }

  void calculateUsage(name service, name action, name provider, name package, std::vector<char> signalRawData) {
    uint64_t amount = DAPPSERVICES_QUOTA_COST;
    packages_t packages(_self, provider.value);
    auto existing = packages.find(package.value);
    if(existing != packages.end()) {
      auto pricing = existing->pricing;
      auto itr = pricing.begin();
      while(itr != pricing.end()) {
        if(itr->action == action) {
          amount = itr->cost_per_action;
          break;
        }
        itr++;
      }
    }

    auto quantity = asset(amount, DAPPSERVICES_QUOTA_SYMBOL);
    usage_t usageResult;
    usageResult.quantity  = quantity;
    usageResult.provider  = provider;
    usageResult.payer     = get_first_receiver();
    usageResult.package   = package;
    usageResult.service   = service;
    dispatchUsage(usageResult);    
  }
};

extern "C" {
void apply(uint64_t receiver, uint64_t code, uint64_t action) {
  if (code == receiver) {
    switch (action) {
      EOSIO_DISPATCH_HELPER(dappservicex, (setlink)(xcallback)(adddsp)(rmvdsp)(init)(xfail)(usage)(pricepkg))
    }
  } else {
    switch (action) { EOSIO_DISPATCH_HELPER(dappservicex, (xsignal)) }
  }
  eosio_exit(0);
}
}
