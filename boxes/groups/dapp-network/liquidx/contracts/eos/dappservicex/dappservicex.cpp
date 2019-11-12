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


  TABLE reward {
    asset balance;
    uint64_t last_usage;

    asset total_staked;
    uint64_t last_inflation_ts;
  };



  typedef eosio::multi_index<"reward"_n, reward> rewards_t;



  [[eosio::action]] void setpayer(name owner, symbol_code symbol) {

  }

  [[eosio::action]] void allowprv(name owner, name provider) {

  }
  [[eosio::action]] void removeprv(name owner, name provider) {

  }


 [[eosio::action]] void xsignal(name service, name action, name provider, name package,
                 std::vector<char> signalRawData) {
    require_auth(get_first_receiver());
    string str(signalRawData.begin(), signalRawData.end());
    auto encodedData = fc::base64_encode(str);
    EMIT_SIGNAL_SVC_EVENT(name(get_first_receiver()), service, action, provider, package,
                          encodedData.c_str());

  }

  [[eosio::action]] void xcallback(name provider, string request_id, string meta) {
    require_auth(provider);
    EMIT_CALLBACK_SVC_EVENT(provider, request_id, meta.c_str());
  }



};

extern "C" {
void apply(uint64_t receiver, uint64_t code, uint64_t action) {
  if (code == receiver) {
    switch (action) {
      EOSIO_DISPATCH_HELPER(dappservicex, (setpayer)(xcallback)(allowprv)(removeprv))
    }
  } else {
    switch (action) { EOSIO_DISPATCH_HELPER(dappservicex, (xsignal)) }
  }
  eosio_exit(0);
}
}
