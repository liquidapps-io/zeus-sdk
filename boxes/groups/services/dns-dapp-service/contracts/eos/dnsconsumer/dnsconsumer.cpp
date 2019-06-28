#include "../dappservices/dns.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  DNS_DAPPSERVICE_ACTIONS 
  
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  DNS_SVC_COMMANDS()
  
  
#define CONTRACT_NAME() dnsconsumer 


CONTRACT_START()
  [[eosio::action]] void updaterecord(name owner, std::string subdomain, std::string type, std::string payload) {
    require_auth(owner); 
    update_dns_entry(owner, subdomain, type, payload, owner);
  }
CONTRACT_END((updaterecord))
