#define VACCOUNTS_DELAYED_CLEANUP 120

#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"
#include "../dappservices/vaccounts.hpp"
#include <eosio/singleton.hpp>

#define DAPPSERVICES_ACTIONS()                                                 \
  XSIGNAL_DAPPSERVICE_ACTION                                                   \
  IPFS_DAPPSERVICE_ACTIONS                                                     \
  VACCOUNTS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS()                                         \
  IPFS_SVC_COMMANDS() VACCOUNTS_SVC_COMMANDS()

#define CONTRACT_NAME() storageconsumer

CONTRACT_START()

TABLE storagecfg {
  // all measurements in bytes
  uint64_t max_file_size_in_bytes = UINT64_MAX;
  uint64_t global_upload_limit_per_day = UINT64_MAX;
  uint64_t vaccount_upload_limit_per_day = UINT64_MAX;
};
typedef eosio::singleton<"storagecfg"_n, storagecfg> storagecfg_t;

ACTION setstoragecfg(const uint64_t &max_file_size_in_bytes,
                     const uint64_t &global_upload_limit_per_day,
                     const uint64_t &vaccount_upload_limit_per_day) {
  require_auth(get_self());
  storagecfg_t storagecfg_table(get_self(), get_self().value);
  auto storagecfg = storagecfg_table.get_or_default();

  storagecfg.max_file_size_in_bytes = max_file_size_in_bytes;
  storagecfg.global_upload_limit_per_day = global_upload_limit_per_day;
  storagecfg.vaccount_upload_limit_per_day = vaccount_upload_limit_per_day;

  storagecfg_table.set(storagecfg, get_self());
}

struct dummy_action_hello {
  name vaccount;
  uint64_t b;
  uint64_t c;

  EOSLIB_SERIALIZE(dummy_action_hello, (vaccount)(b)(c))
};

[[eosio::action]] void hello(dummy_action_hello payload) {
  require_vaccount(payload.vaccount);

  print("hello from ");
  print(payload.vaccount);
  print(" ");
  print(payload.b + payload.c);
  print("\n");
}

VACCOUNTS_APPLY(((dummy_action_hello)(hello)))

CONTRACT_END((hello)(regaccount)(setstoragecfg)(xdcommit)(xvinit))
