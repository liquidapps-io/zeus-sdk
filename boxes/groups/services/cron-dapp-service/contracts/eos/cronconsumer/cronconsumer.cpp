#include "../dappservices/cron.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  CRON_DAPPSERVICE_ACTIONS \

#define DAPPSERVICE_ACTIONS_COMMANDS() \
  CRON_SVC_COMMANDS()

#define CONTRACT_NAME() cronconsumer

CONTRACT_START()

  TABLE stat {
      uint64_t   counter = 0;
  };
  typedef eosio::singleton<"stat"_n, stat> stats_def;

  TABLE payloadtbl {
      string   payload = "";
  };
  typedef eosio::singleton<"payloadtbl"_n, payloadtbl> payload_def;
  
  bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){
    stats_def statstable(_self, timer.value);
    stat newstats;
    if(!statstable.exists()){
      statstable.set(newstats, _self);
    }
    else{
      newstats = statstable.get();
    }
    if(payload.size() > 0) {
      payload_def payloadtable(_self, timer.value);
      payloadtbl newpayload;
      string payload_string(payload.begin(), payload.end());
      newpayload.payload = payload_string;
      payloadtable.set(newpayload, _self);
      return false;
    }
    newstats.counter++;
    statstable.set(newstats, _self);
    // reschedule
    return (newstats.counter < 45);
  }

  // test scheduling timer scoped to _self with 2s interval
  [[eosio::action]] void testschedule(uint32_t interval) {
      // optional payload for data to be passed to timer_callback
      std::vector<char> payload;
      schedule_timer(_self, payload, interval);
  }

  // test multiple timers by scoping each timer by account with 2s interval
  [[eosio::action]] void multitimer(name account, uint32_t interval) {
      // optional payload for data to be passed to timer_callback
      std::vector<char> payload;
      schedule_timer(account, payload, interval);
  }

  // remove timer by scope
  [[eosio::action]] void removetimer(name account) {
      remove_timer(account);
  }

  // test passing payload to timer_callback
  [[eosio::action]] void testpayload(name account, std::vector<char> payload, uint32_t seconds) {
      schedule_timer(account, payload, seconds);
  }
CONTRACT_END((testschedule)(multitimer)(removetimer)(testpayload))
