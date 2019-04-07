#pragma once
#include <string>
#include <vector>
#include <eosiolib/eosio.hpp>
#include <eosiolib/crypto.h>
using std::vector;

#define CRON_DAPPSERVICE_ACTIONS_MORE() \
static std::vector<char> schedule_timer(name timer,std::vector<char> payload, uint32_t seconds){  \
    SEND_SVC_REQUEST(schedule, timer, payload, seconds); \
}  \
SVC_RESP_CRON(schedule)(name> timer,std::vector<char> payload, uint32_t seconds){ \
    timer_callback(timer, payload, seconds);\
} \
