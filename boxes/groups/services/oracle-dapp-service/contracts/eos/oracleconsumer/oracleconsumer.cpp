#include "../dappservices/oracle.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  ORACLE_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS() 

#define CONTRACT_NAME() oracleconsumer 
// define custom filter
#undef ORACLE_HOOK_FILTER
#define ORACLE_HOOK_FILTER(uri, data) filter_result(uri, data);
CONTRACT_START()
  void filter_result(std::vector<char> uri, std::vector<char> data){
    //eosio::check(data.size() > 3, "result too small");
  }
  // use singleton to hold minimum amount of DSPs that need to be heard from to consider a response valid
  TABLE threshold {
      uint32_t   threshold = 1; // defaults to 1 so if 1 DSP returns a value, the oracle fetch is deemed valid
  };
  typedef eosio::singleton<"threshold"_n, threshold> threshold_t;

  // test requesting a result while also passing the expected field and asserting if the min amount of DSPs do not return a response
 [[eosio::action]] void testget(std::vector<char>  uri, std::vector<char> expectedfield) {
    eosio::check(getURI(uri, [&]( auto& results ) { 
      // fetch threshold of DSPs that must respond for the oracle fetch to be valid (defaults to 1 if not set with setthreshold)
      threshold_t threshold_singleton(_self, _self.value);
      threshold thresholdsingleton = threshold_singleton.get_or_default(); // singleton.hpp - get_or_default: Get the value stored inside the singleton table. If it doesn't exist, it will return the specified default value
      uint32_t dsp_threshold = thresholdsingleton.threshold;
      // ensure the specified amount of DSPs have responded before a response is accepted
      eosio::check(results.size() >= dsp_threshold, "require multiple results for consensus");
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
  
  // test requesting a result without checking how many DSPs have responded or comparing against an expected result
  [[eosio::action]] void testrnd(std::vector<char> uri) {
    getURI(uri, [&]( auto& results ) { 
      return results[0].result;
    });
  }
  
  // test multiple oracle requests within 1 trx
  [[eosio::action]] void testmult(std::vector<char> uri_one, std::vector<char> uri_two) {
    auto res1 = getURI(uri_one, [&]( auto& results ) { 
      return results[0].result;
    });
    auto res2 = getURI(uri_two, [&]( auto& results ) { 
      return results[0].result;
    });
  }

  // sets the threshold of DSPs that must return a response
  [[eosio::action]] void setthreshold(uint32_t new_threshold_val) {
      // require auth of contract to set new DSP threshold
      require_auth(_self);
      // set new threshold
      threshold_t threshold_singleton(_self, _self.value);
      threshold new_threshold = threshold_singleton.get_or_default();
      new_threshold.threshold = new_threshold_val;
      threshold_singleton.set(new_threshold, _self);
  }
CONTRACT_END((testget)(testrnd)(testmult)(setthreshold))
