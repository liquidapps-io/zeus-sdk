#include "../dappservices/oracle.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  ORACLE_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS() 

#define CONTRACT_NAME() oracleconsumer 

CONTRACT_START()
 [[eosio::action]] void testget(std::vector<char>  uri, std::vector<char> expectedfield) {
    eosio::check(getURI(uri, [&]( auto& results ) { 
      eosio::check(results.size() > 0, "require multiple results for consensus");
      auto itr = results.begin();
      auto first = itr->result;
      ++itr;
      while(itr != results.end()) {
        eosio::check(itr->result == first, "consensus failed");
        ++itr;
      }
      return first;
    }) == expectedfield, "wrong data");
  }
  
  [[eosio::action]] void testrnd(std::vector<char> uri) {
    getURI(uri, [&]( auto& results ) { 
      return results[0].result;
    });
  }
CONTRACT_END((testget)(testrnd))
