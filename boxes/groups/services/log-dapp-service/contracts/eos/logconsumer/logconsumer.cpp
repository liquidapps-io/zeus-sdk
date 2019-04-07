#include "../dappservices/log.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  LOG_DAPPSERVICE_ACTIONS

#define DAPPSERVICE_ACTIONS_COMMANDS() \
  LOG_SVC_COMMANDS() 

#define CONTRACT_NAME() logconsumer 

CONTRACT_START()
 [[eosio::action]] void test(uint32_t num) {
    LOG_INFO("Testing log events. Got Number:" + std::to_string(num));
  }
CONTRACT_END((test))