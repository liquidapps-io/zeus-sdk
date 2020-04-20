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
  typedef eosio::multi_index<"stat"_n, stat> stats_def_abi;
  bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){

    stats_def statstable(_self, _self.value);
    stat newstats;
    if(!statstable.exists()){
      statstable.set(newstats, _self);
    }
    else{
      newstats = statstable.get();
    }
    newstats.counter++;
    statstable.set(newstats, _self);

    // reschedule
    return (newstats.counter < 45);
  }
 [[eosio::action]] void testschedule(uint32_t interval) {
    std::vector<char> payload;
    schedule_timer(_self, payload, interval);
  }
CONTRACT_END((testschedule))
