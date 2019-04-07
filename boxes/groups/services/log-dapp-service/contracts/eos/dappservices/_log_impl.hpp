#pragma once

#include <string.h>
#include "../Common/base/base64.hpp"

SVC_RESP_LOG(logevent)(uint32_t size, std::string reciept, name current_provider){
}

SVC_RESP_LOG(logclear)(uint32_t size, std::string reciept, name current_provider){
}

#define LOG(level,msg) \
    log_svc_helper::svc_log_logevent(current_time(),STR(level), __FILE__,STR(__LINE__),__FUNCTION__ , msg);

#define LOG_TRACE(msg) \
    LOG_TRACE(TRACE,msg)

#define LOG_DEBUG(msg) \
    LOG(DEBUG,msg)

#define LOG_INFO(msg) \
    LOG(INFO,msg)
    
#define LOG_WARN(msg) \
    LOG(WARN,msg)

#define LOG_ERROR(msg) \
    LOG(ERROR,msg)
    
#define LOG_FATAL(msg) \
    LOG(FATAL,msg)