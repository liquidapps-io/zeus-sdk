/* DELAY REMOVAL OF USER DATA INTO VRAM */
/* ALLOWS FOR QUICKER ACCESS TO USER DATA WITHOUT THE NEED TO WARM DATA UP */
#define VACCOUNTS_DELAYED_CLEANUP 120

/* ADD NECESSARY LIQUIDACCOUNT / VRAM INCLUDES */
#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"
#include "../dappservices/vaccounts.hpp"

#include <eosio/singleton.hpp>

/* ADD LIQUIDACCOUNT / VRAM RELATED ACTIONS */
#define DAPPSERVICES_ACTIONS()                                                 \
  XSIGNAL_DAPPSERVICE_ACTION                                                   \
  IPFS_DAPPSERVICE_ACTIONS                                                     \
  VACCOUNTS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS()                                         \
  IPFS_SVC_COMMANDS() VACCOUNTS_SVC_COMMANDS()

#define CONTRACT_NAME() storageconsumer

CONTRACT_START()

/* THE storagecfg TABLE STORES STORAGE PARAMS */
TABLE storagecfg {
  // all measurements in bytes
  uint64_t max_file_size_in_bytes = UINT64_MAX; // max file size in bytes that can be uploaded at a time, default 10mb
  uint64_t global_upload_limit_per_day = UINT64_MAX; // max upload limit in bytes per day for EOS account, default 1 GB
  uint64_t vaccount_upload_limit_per_day = UINT64_MAX; // max upload limit in bytes per day for LiquidAccounts, default 10 MB
};
typedef eosio::singleton<"storagecfg"_n, storagecfg> storagecfg_t;

/* SET PARAMS FOR storagecfg TABLE */
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

/* THE FOLLOWING STRUCT DEFINES THE PARAMS THAT MUST BE PASSED FOR A LIQUIDACCOUNT TRX */
struct dummy_action_hello {
  name vaccount;
  uint64_t b;
  uint64_t c;

  EOSLIB_SERIALIZE(dummy_action_hello, (vaccount)(b)(c))
};

/* DATA IS PASSED AS PAYLOADS INSTEAD OF INDIVIDUAL PARAMS */
[[eosio::action]] void hello(dummy_action_hello payload) {
  /* require_vaccount is the equivalent of require_auth for EOS */
  require_vaccount(payload.vaccount);

  print("hello from ");
  print(payload.vaccount);
  print(" ");
  print(payload.b + payload.c);
  print("\n");
}

/* EACH ACTION MUST HAVE A STRUCT THAT DEFINES THE PAYLOAD SYNTAX TO BE PASSED */
VACCOUNTS_APPLY(((dummy_action_hello)(hello)))

CONTRACT_END((hello)(regaccount)(setstoragecfg)(xdcommit)(xvinit))