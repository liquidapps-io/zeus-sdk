#include "../dappservices/sign.hpp"
#include "../Common/events.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  SIGN_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  SIGN_SVC_COMMANDS() 

#define CONTRACT_NAME() signer

#define MULTISIG_METHOD_ID "c6427474"
#define TRANSFER_METHOD_ID "a9059cbb"
#define MULTISIG_ENCODED_TRANFER_RIGHT_PADDING "00000000000000000000000000000000000000000000000000000000"
#define BYTES_ARRAY_POINTER "0000000000000000000000000000000000000000000000000000000000000060"
#define TRANSFER_BYTES_ARRAY_SIZE "0000000000000000000000000000000000000000000000000000000000000044"
#define ONE_LEFT_PADDED "0000000000000000000000000000000000000000000000000000000000000001"
#define EMPTY_DATA_LEFT_PADDED "0000000000000000000000000000000000000000000000000000000000000000"
#define ENCODED_METHOD_NO_DATA_TAIL BYTES_ARRAY_POINTER ONE_LEFT_PADDED EMPTY_DATA_LEFT_PADDED

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

  std::string clean_eth_address(std::string address) {
    // remove initial 0x if there
    if (address[1] == 'x') {
      return address.substr(2);
    }
    return address;
  }

 [[eosio::action]] void sendsigreq(std::string id, std::string destination, std::string trx_data, std::string chain, std::string chain_type, std::string account)
  {
    svc_sign_signtrx(id, destination, trx_data, chain, chain_type, account, 1);
  }

 [[eosio::action]] void sendeth(std::string multisig_address, std::string destination, uint128_t amount, std::string chain)
  {
    std::string data = MULTISIG_METHOD_ID +\
    pad_left(clean_eth_address(destination)) +\
    pad_left(num_to_hex_string(amount)) +\
    ENCODED_METHOD_NO_DATA_TAIL;

    std::string id = "1";
    // std::string chain = "evmlocal";
    std::string chain_type = "ethereum";
    std::string account = "signservice1";
    svc_sign_signtrx(id, multisig_address, data, chain, chain_type, account, 1);
  }

 [[eosio::action]] void sendtoken(std::string multisig_address, std::string token_address, std::string destination, uint128_t amount, std::string chain)
  {
    std::string method_data = TRANSFER_METHOD_ID +\
    pad_left(clean_eth_address(destination)) +\
    pad_left(num_to_hex_string(amount)) +\
    MULTISIG_ENCODED_TRANFER_RIGHT_PADDING;

    std::string data = MULTISIG_METHOD_ID +\
    pad_left(clean_eth_address(token_address)) +\
    EMPTY_DATA_LEFT_PADDED +\
    BYTES_ARRAY_POINTER +\
    TRANSFER_BYTES_ARRAY_SIZE +\
    method_data;

    std::string id = "1";
    std::string chain_type = "ethereum";
    std::string account = "signservice1";
    svc_sign_signtrx(id, multisig_address, data, chain, chain_type, account, 1);
  }

  [[eosio::action]] void signalaction(std::string data)
  {
    std::string id = "1";
    std::string chain = "mainnet";
    std::string chain_type = "eos";
    std::string account = "signservice1";
    std::string multisig_account = "eosio.msig";
    svc_sign_signtrx(data, multisig_account, data, chain, chain_type, account, 1);
  }

 [[eosio::action]] void sendevm(std::string multisig_address, std::string token_address, std::string destination, uint128_t amount, std::string chain)
  {
    std::string method_data = TRANSFER_METHOD_ID +\
    pad_left(clean_eth_address(destination)) +\
    pad_left(num_to_hex_string(amount)) +\
    MULTISIG_ENCODED_TRANFER_RIGHT_PADDING;

    std::string data = MULTISIG_METHOD_ID +\
    pad_left(clean_eth_address(token_address)) +\
    EMPTY_DATA_LEFT_PADDED +\
    BYTES_ARRAY_POINTER +\
    TRANSFER_BYTES_ARRAY_SIZE +\
    method_data;

    std::string id = "1";
    std::string chain_type = "ethereum";
    std::string account = "signservice1";
    svc_sign_signtrx(id, multisig_address, data, chain, chain_type, account, 1);
  }

CONTRACT_END((sendsigreq)(sendeth)(sendtoken)(signalaction)(sendevm))
