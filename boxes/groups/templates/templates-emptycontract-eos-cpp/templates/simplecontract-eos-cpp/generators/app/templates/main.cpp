#include <eosio/eosio.hpp>

using namespace eosio;

CONTRACT hello : public eosio::contract {
  using contract::contract;
  public:

  [[eosio::action]] void print(std::string message) {
    check(message == "hello","not hello");
  }
};