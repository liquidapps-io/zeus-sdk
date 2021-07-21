#include <eosio/eosio.hpp>
#include "../Common/events.hpp"

using namespace eosio;

#define EMIT_SOMETEST_EVENT(number, field1) \
    START_EVENT("someevent", "1.3") \
    EVENTKV("number", std::to_string(number).c_str()) \
    EVENTKVL("field1", field1) \
    END_EVENT()
    

CONTRACT <%- contractname %> : public eosio::contract {
  public:
      using contract::contract;

     [[eosio::action]] void hi( uint64_t number ) {
         EMIT_SOMETEST_EVENT(number, "321")
         
      }
};

EOSIO_DISPATCH( helloworld, (hi) )