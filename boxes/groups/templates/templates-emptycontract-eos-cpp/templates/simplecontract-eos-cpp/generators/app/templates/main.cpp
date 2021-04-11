#include <eosio/eosio.hpp>

using namespace eosio;

CONTRACT mycontract : public eosio::contract {
  using contract::contract;
  public:

  [[eosio::action]]
  void hello(std::string message) {
    print(message);
  }
};