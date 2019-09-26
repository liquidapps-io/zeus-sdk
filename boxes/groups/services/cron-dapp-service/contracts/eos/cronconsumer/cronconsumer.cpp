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
    return (newstats.counter < 10);
  }
 [[eosio::action]] void testschedule() {
    std::vector<char> payload;
    schedule_timer(_self, payload, 2);
  }
CONTRACT_END((testschedule))
