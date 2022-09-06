#include <eosio/eosio.hpp>
#include <eosio/print.hpp>

using namespace eosio;

CONTRACT <%- contractname %> : public eosio::contract {
  using contract::contract;
  public:

  [[eosio::action]] void testassert(std::string message) {
    check(message == "hello","not hello");
  }

  [[eosio::action]] void testprint(std::string message) {
    print(message);
  }
};