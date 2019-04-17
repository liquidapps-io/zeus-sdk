#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
using std::vector;

#define CRON_DAPPSERVICE_SKIP_HELPER true
#define CRON_DAPPSERVICE_SERVICE_MORE \
  void timer_callback(name timer, std::vector<char> payload, uint32_t seconds){\
      print("should never get here");\
  }
  
#define CRON_DAPPSERVICE_ACTIONS_MORE() \
static void schedule_timer(name timer,std::vector<char> payload, uint32_t seconds){  \
    SEND_SVC_REQUEST(schedule, timer, payload, seconds); \
}  \
SVC_RESP_CRON(schedule)(name timer,std::vector<char> payload, uint32_t seconds, name current_provider){ \
    timer_callback(timer, payload, seconds);\
} 



