#include "../dappservices/oracle.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  ORACLE_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS() 

#define CONTRACT_NAME() oracleconsumer 

CONTRACT_START()
 [[eosio::action]] void testget(std::vector<char>  uri, std::vector<char> expectedfield) {
    eosio_assert(getURI(uri, [&]( auto& results ) { 
      return results[0].result;
    }) == expectedfield, "wrong data");
  }
CONTRACT_END((testget))
