#include "../dappservices/readfn.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  READFN_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  READFN_SVC_COMMANDS() 

#define CONTRACT_NAME() readfnconsumer

CONTRACT_START()
 [[eosio::action]] void readtest(uint32_t testnum) {
    READFN_RETURN("hello-" + std::string(fc::to_string(testnum)));
  }
CONTRACT_END((readtest))
