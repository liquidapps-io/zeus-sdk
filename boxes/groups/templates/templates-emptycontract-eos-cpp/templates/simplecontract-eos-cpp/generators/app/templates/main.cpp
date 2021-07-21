#include <eosio/eosio.hpp>

using namespace eosio;

CONTRACT <%- contractname %> : public eosio::contract {
  using contract::contract;
  public:

  [[eosio::action]]
  void hello(std::string message) {
    print(message);
  }
};