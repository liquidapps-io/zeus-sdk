#include "../dappservices/sign.hpp"
#include "../Common/events.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  SIGN_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  SIGN_SVC_COMMANDS() 

#define CONTRACT_NAME() signer

#define MULTISIG_METHOD_ID "c6427474"
#define ENCODED_METHOD_NO_DATA_TAIL\
  "000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"

CONTRACT_START()
  std::string num_to_hex_string(uint128_t num)
  {
    uint128_t r;
    std::string hex_string = "";
    char hex[] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};
      while(num > 0)
      {
        r = num % 16;
        hex_string = hex[r] + hex_string;
        num = num/16;
      }
    return hex_string;
  }

  std::string pad_left(std::string data) {
    std::string s(64 - data.size(), '0');
    return s.append(data);
  }

 [[eosio::action]] void sendsigreq(std::string id, std::string destination, std::string trx_data, std::string chain, std::string chain_type, std::string account)
  {
    svc_sign_signtrx(id, destination, trx_data, chain, chain_type, account);
  }

 [[eosio::action]] void sendeth(std::string multisig_address, std::string destination, uint128_t amount)
  {
    std::string data = MULTISIG_METHOD_ID +\
    pad_left(destination) +\
    pad_left(num_to_hex_string(amount)) +\
    ENCODED_METHOD_NO_DATA_TAIL;

    std::string id = "1";
    std::string chain = "mainnet";
    std::string chain_type = "ethereum";
    std::string account = "signservice1";
    svc_sign_signtrx(data, multisig_address, data, chain, chain_type, account);
  }

CONTRACT_END((sendsigreq)(sendeth))
