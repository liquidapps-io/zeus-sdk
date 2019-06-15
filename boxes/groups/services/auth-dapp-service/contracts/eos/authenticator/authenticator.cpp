#include "../dappservices/auth.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  AUTH_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  AUTH_SVC_COMMANDS() 

#define CONTRACT_NAME() authenticator

CONTRACT_START()
 bool allow_usage(name account, name permission, std::string client_code, checksum256 payload_hash,std::vector<char> signature, name current_provider){
     require_auth(permission_level{account, permission}); 
     return true;
 }
CONTRACT_END()
