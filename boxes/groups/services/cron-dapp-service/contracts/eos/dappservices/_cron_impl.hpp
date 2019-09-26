#pragma once
#include <string>
#include <vector>
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
using std::vector;


#define CRON_DAPPSERVICE_SKIP_HELPER true
#define CRON_DAPPSERVICE_SERVICE_MORE \
  bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){\
      print("should never get here");\
      return false; \
  }
#define CRON_DAPPSERVICE_ACTIONS_MORE() \
  TABLE timerentry { \
      int64_t   set_timestamp = 0; \
      int64_t   fired_timestamp = 0; \
  };\
  typedef eosio::singleton<"timer"_n, timerentry> timers_def;\
static void schedule_timer(name timer,std::vector<char> payload, uint32_t seconds){  \
    timers_def timers(current_receiver(), timer.value); \
    timerentry newtimer; \
    if(timers.exists()){ \
        newtimer = timers.get(); \
    } \
    newtimer.fired_timestamp = 0;\
    newtimer.set_timestamp = eosio::current_time_point().time_since_epoch().count();\
    timers.set(newtimer, current_receiver()); \
    SEND_SVC_REQUEST(schedule, timer, payload, seconds); \
}  \
static void remove_timer(name timer,std::vector<char> payload, uint32_t seconds){  \
    timers_def timers(current_receiver(), timer.value); \
    if(timers.exists()){ \
        timers.remove(); \
    } \
}  \
SVC_RESP_CRON(schedule)(name timer,std::vector<char> payload, uint32_t seconds,name current_provider){ \
    timers_def timers(current_receiver() , timer.value); \
    if(!timers.exists()) \
        return; \
    auto current_timer = timers.get(); \
    if(current_timer.fired_timestamp != 0 || (current_timer.set_timestamp + (seconds * 1000000) > eosio::current_time_point().time_since_epoch().count()))\
        return; \
    current_timer.fired_timestamp = eosio::current_time_point().time_since_epoch().count(); \
    timers.set(current_timer, current_receiver()); \
    if(!timer_callback(timer, payload, seconds)) \
        return; \
    schedule_timer(timer, payload, seconds);\
} \



