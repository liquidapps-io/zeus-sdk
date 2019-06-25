#include "../dappservices/<%- servicename %>.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  <%- serviceuppername %>_DAPPSERVICE_ACTIONS 
  
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  <%- serviceuppername %>_SVC_COMMANDS()
  
  
#define CONTRACT_NAME() <%- consumercontractname %> 


CONTRACT_START()

  [[eosio::action]] void init(name payload) {
  }
  
  
CONTRACT_END((init))
