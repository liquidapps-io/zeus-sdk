#include "../dappservices/cron.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  CRON_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  CRON_SVC_COMMANDS() 

#define CONTRACT_NAME() cronconsumer 

CONTRACT_START()
  void timer_callback(name timer, std::vector<char> payload, uint32_t seconds){
    
    // reschedule
    schedule_timer(_self, payload, seconds);
  }
 [[eosio::action]] void testschedule() {
    std::vector<char> payload;
    schedule_timer(_self, payload, 5);
  }
CONTRACT_END((testschedule))
