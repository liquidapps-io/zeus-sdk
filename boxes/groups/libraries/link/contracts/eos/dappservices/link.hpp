#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/ipfs.hpp"

#ifndef DAPPSERVICES_ACTIONS
#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  CRON_DAPPSERVICE_ACTIONS \
  IPFS_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS
#endif
#ifndef DAPPSERVICE_ACTIONS_COMMANDS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()IPFS_SVC_COMMANDS()
#endif
// define custom filter
#undef ORACLE_HOOK_FILTER
#define ORACLE_HOOK_FILTER(uri, data) filter_result(uri, data);
#define emptyentry() vector<char>()

#ifndef LINK_PROCESSING_TIMEOUT
#define LINK_PROCESSING_TIMEOUT 60
#endif

#ifndef LINK_PROVIDER_THRESHOLD
#define LINK_PROVIDER_THRESHOLD 1
#endif

#define MESSAGE_RECEIVED_HOOK(message) dummy_received(message);
#define MESSAGE_RECEIVED_FAILURE_HOOK(message) dummy_received(message);
#define MESSAGE_RECEIPT_HOOK(receipt) dummy_receipt(receipt);
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) dummy_receipt(receipt);

struct message_payload {
    vector<char> data;
    //should we have a nonce or unique identifier?
};

struct message_receipt {
    vector<char> data;
    vector<char> response;
    bool success; // if false must return
};

vector<char> dummy_received(message_payload message) {return emptyentry();}
void dummy_receipt(message_receipt) {}

TABLE settings_t {
    name sister_code; // name of corresponding bridge for oracle queries
    string sister_chain_name;
    string this_chain_name;
    bool processing_enabled;
    uint64_t last_irreversible_block_time; // number is preferred...
    uint64_t last_received_releases_id;
    uint64_t last_received_receipts_id;
    uint64_t last_confirmed_messages_id;
    uint64_t last_pending_messages_id;
    uint64_t last_confirmed_receipts_id; //TODO: Do we need?
    uint64_t last_pending_receipts_id; //TODO: Do we need?
};
typedef eosio::singleton<"settings"_n, settings_t> settings_table;
typedef eosio::multi_index<"settings"_n, settings_t> settings_table_abi;

// contains all transfers with given timestamp
TABLE pending_messages_t {
    uint64_t id;
    std::vector<message_payload> messages;
    uint64_t received_block_time; // time instead of block
    uint64_t primary_key()const { return id; }
};

// this shouldn't be a table but rather an ipfs pointer
TABLE confirmed_messages_t {
    uint64_t id;
    uint64_t received_block_time; // time instead of block
    string messages_uri;
    uint64_t primary_key()const { return id; }
};

typedef eosio::multi_index<"pmessages"_n, pending_messages_t> pending_messages_table_t;
typedef eosio::multi_index<"cmessages"_n, confirmed_messages_t> confirmed_messages_table_t;

TABLE pending_receipts_t {
    uint64_t id;
    std::vector<message_receipt> message_receipts;
    uint64_t received_block_time; // time instead of block
    uint64_t primary_key()const { return id; }
};

TABLE messages_receipt_t {
    uint64_t id;
    std::vector<message_receipt> message_receipts;
    uint64_t received_block_time; // time instead of block
    uint64_t last_success_block_time; //increment this with each successful hndlreceipt //TODO: use this?
    uint64_t primary_key()const { return id; }
};
TABLE compressed_messages_receipt_t {
    uint64_t id;
    string receipts_uri;
    uint64_t received_block_time; // time instead of block
    uint64_t primary_key()const { return id; }
};
TABLE failed_receipt_t {
    uint64_t id;
    uint64_t receipts_id;
    message_receipt failed_receipt;
    uint64_t failed_block_time;
    uint64_t primary_key()const { return id; }
};

typedef eosio::multi_index<"preceipts"_n, pending_receipts_t> pending_receipts_table_t;
typedef eosio::multi_index<"creceipts"_n, compressed_messages_receipt_t> confirmed_receipts_table_t;

// local receipts vs foreign receipts
typedef eosio::multi_index<"lreceipts"_n, compressed_messages_receipt_t> compressed_local_receipts_table_t;
typedef eosio::singleton<"clreceipts"_n, messages_receipt_t> current_local_receipts_table_t;
typedef eosio::multi_index<"clreceipts"_n, messages_receipt_t> current_local_receipts_table_abi;
typedef eosio::multi_index<"freceipts"_n, compressed_messages_receipt_t> compressed_foreign_receipts_table_t;
// current receipts being processed (always uncompressed singleton)
typedef eosio::singleton<"cfreceipts"_n, messages_receipt_t> current_foreign_receipts_table_t;
typedef eosio::multi_index<"cfreceipts"_n, messages_receipt_t> current_foreign_receipts_table_abi;
// receipts that failed to be resolved
typedef eosio::multi_index<"ffreceipts"_n, failed_receipt_t> failed_foreign_receipts_table_t;


// in case of failed transfers and for 2 way bridge
TABLE releases_t {
    uint64_t id;
    std::vector<message_payload> releases;
    uint64_t received_block_time; // time instead of block
    uint64_t last_success_block_time; //increment this with each successful hndlrelease
};
TABLE compressed_releases_t {
    uint64_t id;
    string releases_uri;
    uint64_t received_block_time; // time instead of block
    uint64_t primary_key()const {return id;}
};
typedef eosio::multi_index<"releases"_n, compressed_releases_t> compressed_releases_table_t;
typedef eosio::singleton<"creleases"_n, releases_t> current_releases_table_t;
typedef eosio::multi_index<"creleases"_n, releases_t> current_releases_table_abi;

struct message_t {
  uint64_t id;
  string message;
};

TABLE messages {
  uint64_t id;
  bool remote;
  string sent_message;
  string response_message;
  uint64_t primary_key()const { return id; }
};
typedef eosio::multi_index<"messages"_n, messages> messages_table;

// oracle to confirm irreversibility
uint64_t get_last_irreversible_block(string chain_name) {
    // local mainnet needs to be configurable? hmm
    string last_irreversible_uri_string = "sister_chain_last_irreversible://" + chain_name;
    vector<char> last_irreversible_uri(last_irreversible_uri_string.begin(), last_irreversible_uri_string.end());
    vector<char> last_irreversible_string = oracle_svc_helper::getURI(last_irreversible_uri, [&]( auto& results ) {
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        return results[0].result;
    });
    uint64_t last_irreversible = *reinterpret_cast<uint64_t *>(&last_irreversible_string);
    return last_irreversible;
}

bool handle_get_releases() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    uint64_t next_releases_id = settings.last_received_releases_id + 1;
    string uri_string =
        "sister_chain_table_row://"
        + settings.sister_chain_name + "/"
        + settings.sister_code.to_string() + "/"
        + "cmessages/"
        + settings.sister_code.to_string() + "/"
        + fc::to_string(next_releases_id) + "/"
        + "messages_uri/";
    vector<char> uri(uri_string.begin(), uri_string.end());
    vector<char> releases_uri = oracle_svc_helper::getURI(uri, [&]( auto& results ) {
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        return results[0].result;
    });
    string releases_uri_string(releases_uri.begin(), releases_uri.end());
    compressed_releases_table_t releases_table(_self, _self.value);
    releases_table.emplace(_self, [&]( auto& a ){
        a.releases_uri = releases_uri_string;
        a.id = next_releases_id;
        a.received_block_time = eosio::current_time_point().sec_since_epoch();
    });
    settings.last_received_releases_id = next_releases_id;
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}

// may need to modify uri to request lrrid+1
bool handle_get_receipts() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    uint64_t next_receipts_id = settings.last_received_receipts_id + 1;
    string uri_string =
        "sister_chain_table_row://"
        + settings.sister_chain_name + "/"
        + settings.sister_code.to_string() + "/"
        + "creceipts/"
        + settings.sister_code.to_string() + "/"
        + fc::to_string(next_receipts_id) + "/"
        + "receipts_uri/";
    vector<char> uri(uri_string.begin(), uri_string.end());
    vector<char> receipts_uri = oracle_svc_helper::getURI(uri, [&]( auto& results ) {
        //eosio::check(results.size() >= dsp_threshold, "total amount of DSP responses received are less than minimum threshold specified");
        return results[0].result;
    });
    string receipts_uri_string(receipts_uri.begin(), receipts_uri.end());
    compressed_foreign_receipts_table_t receipts_table(_self, _self.value);
    receipts_table.emplace(_self, [&]( auto& a ){
        a.receipts_uri = receipts_uri_string;
        a.id = next_receipts_id;
        a.received_block_time = eosio::current_time_point().sec_since_epoch();
    });
    settings.last_received_receipts_id = next_receipts_id;
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}

// id is increasing counter, not block number
bool handle_confirm_block() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();    
    pending_messages_table_t pending_messages(_self, _self.value);
    pending_receipts_table_t pending_receipts(_self, _self.value);
    auto p_messages = pending_messages.find(settings.last_confirmed_messages_id + 1);
    auto p_receipts = pending_receipts.find(settings.last_confirmed_receipts_id + 1);
    // check there exists pending transfers, otherwise abort cron
    eosio::check(p_messages != pending_messages.end() || p_receipts != pending_receipts.end(), "{abort_service_request}");
    // mismatch between block num and timestamp :/
    if(p_messages != pending_messages.end()) {
        if(settings.last_irreversible_block_time <= p_messages->received_block_time) {
            uint64_t last_irreversible_block_time = get_last_irreversible_block(settings.this_chain_name);
            settings.last_irreversible_block_time = last_irreversible_block_time;        
        }
        if(settings.last_irreversible_block_time > p_messages->received_block_time) {
            settings.last_confirmed_messages_id += 1;
            auto messages_uri = ipfs_svc_helper::setData(p_messages->messages);
            confirmed_messages_table_t confirmed_transfers(_self, _self.value);
            confirmed_transfers.emplace(_self, [&](auto& a){
                a.id = p_messages->id;
                a.received_block_time = p_messages-> received_block_time;
                a.messages_uri = messages_uri;
            });
            pending_messages.erase(p_messages);
        }
    }
    if(p_receipts != pending_receipts.end()) {
        if(settings.last_irreversible_block_time <= p_receipts->received_block_time) {
            uint64_t last_irreversible_block_time = get_last_irreversible_block(settings.this_chain_name);
            settings.last_irreversible_block_time = last_irreversible_block_time;        
        }
        if(settings.last_irreversible_block_time > p_receipts->received_block_time) {
            settings.last_confirmed_receipts_id += 1;
            auto receipts_uri = ipfs_svc_helper::setData(p_receipts->message_receipts);
            confirmed_receipts_table_t confirmed_receipts(_self, _self.value);
            confirmed_receipts.emplace(_self, [&](auto& a){
                a.id = p_receipts->id;
                a.received_block_time = p_messages-> received_block_time;
                a.receipts_uri = receipts_uri;
            });
            pending_receipts.erase(p_receipts);
        }
    }    
    
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}

// we only want to receive a non-empty manifest uri
// we also get last irreversible block, should check that it's new
void filter_result(std::vector<char> uri, std::vector<char> data) {
    // need to hardcode for optimization?
    std::vector emptyDataHash = uri_to_ipfsmultihash(ipfs_svc_helper::setRawData(emptyentry(), true));
    check(data != emptyDataHash, "{abort_service_request}");
}

void push_receipt(message_receipt receipt) {
    auto _self = name(current_receiver());
    pending_receipts_table_t pending_receipts(_self, _self.value);
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    uint64_t last_pending_receipts_id = settings.last_pending_receipts_id; 
    auto p_receipts = pending_receipts.find(last_pending_receipts_id);
    if(p_receipts == pending_receipts.end()) {
        settings.last_pending_receipts_id += 1;
        settings_singleton.set(settings, _self);
        vector<message_receipt> message_receipts{ receipt };
        pending_receipts.emplace(_self, [&]( auto& a ){
            a.id = last_pending_receipts_id + 1;
            a.message_receipts = message_receipts;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
    else if (p_receipts->received_block_time < eosio::current_time_point().sec_since_epoch()) {
        settings.last_pending_receipts_id += 1;
        settings_singleton.set(settings, _self);
        vector<message_receipt> message_receipts{ receipt };
        pending_receipts.emplace(_self, [&]( auto& a ){
            a.id = last_pending_receipts_id + 1;
            a.message_receipts = message_receipts;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
    else {
        pending_receipts.modify(p_receipts, _self, [&]( auto& a ){
            a.message_receipts.emplace_back(receipt);
        });
    }
}

template<typename T>
void pushMessage(T obj) {    
    auto _self = name(current_receiver());    
    auto data = eosio::pack<T>(obj);
    pending_messages_table_t pending_messages(_self, _self.value);
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    uint64_t last_pending_messages_id = settings.last_pending_messages_id;
    auto p_messages = pending_messages.find(last_pending_messages_id);
    message_payload current_message = { data };
    // if all pending messages have been confirmed
    //TODO: let's DRY this 
    if (p_messages == pending_messages.end()) {
        settings.last_pending_messages_id += 1;
        settings_singleton.set(settings, _self);
        vector<message_payload> messages{ current_message };
        pending_messages.emplace(_self, [&]( auto& a ){
            a.id = last_pending_messages_id + 1;
            a.messages = messages;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
    // if this is the first message in a new block
    else if (p_messages->received_block_time < eosio::current_time_point().sec_since_epoch()) {
        settings.last_pending_messages_id += 1;
        settings_singleton.set(settings, _self);
        vector<message_payload> messages{ current_message };
        pending_messages.emplace(_self, [&]( auto& a ){
            a.id = last_pending_messages_id + 1;
            a.messages = messages;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
    // if this is not the first message in this block
    else {
        pending_messages.modify(p_messages, _self, [&]( auto& a ){
            a.messages.emplace_back(current_message);
        });
    }    
}

#define LINK_BOOTSTRAP() \
TABLE settings_t { \
    name sister_code; \
    string sister_chain_name; \
    string this_chain_name; \
    bool processing_enabled; \
    uint64_t last_irreversible_block_time; \
    uint64_t last_received_releases_id; \
    uint64_t last_received_receipts_id; \
    uint64_t last_confirmed_messages_id; \
    uint64_t last_pending_messages_id; \
    uint64_t last_confirmed_receipts_id;\
    uint64_t last_pending_receipts_id;\
}; \
TABLE pending_messages_t { \
    uint64_t id; \
    std::vector<message_payload> transfers; \
    uint64_t received_block_time; \
    uint64_t primary_key()const { return id; } \
}; \
TABLE confirmed_messages_t { \
    uint64_t id; \
    uint64_t received_block_time; \
    string messages_uri; \
    uint64_t primary_key()const { return id; } \
}; \
TABLE messages_receipt_t { \
    uint64_t id; \
    std::vector<message_receipt> message_receipts; \
    uint64_t received_block_time; \
    uint64_t last_success_block_time; \
    uint64_t primary_key()const { return id; } \
}; \
TABLE pending_receipts_t {\
    uint64_t id;\
    std::vector<message_receipt> message_receipts;\
    uint64_t received_block_time;\
    uint64_t primary_key()const { return id; }\
};\
TABLE compressed_messages_receipt_t { \
    uint64_t id; \
    string receipts_uri; \
    uint64_t received_block_time; \
    uint64_t primary_key()const { return id; } \
}; \
TABLE releases_t { \
    uint64_t id; \
    std::vector<message_payload> releases; \
    uint64_t received_block_time; \
    uint64_t last_success_block_time; \
}; \
TABLE compressed_releases_t { \
    uint64_t id; \
    string releases_uri; \
    uint64_t received_block_time; \
    uint64_t primary_key()const {return id;} \
}; \
TABLE failed_receipt_t {\
    uint64_t id;\
    uint64_t receipts_id;\
    message_receipt failed_receipt;\
    uint64_t failed_block_time;\
    uint64_t primary_key()const { return id; } \
};\
typedef eosio::singleton<"settings"_n, settings_t> settings_table; \
typedef eosio::multi_index<"settings"_n, settings_t> settings_table_abi; \
typedef eosio::multi_index<"lreceipts"_n, compressed_messages_receipt_t> compressed_local_receipts_table_t; \
typedef eosio::singleton<"clreceipts"_n, messages_receipt_t> current_local_receipts_table_t; \
typedef eosio::multi_index<"clreceipts"_n, messages_receipt_t> current_local_receipts_table_abi; \
typedef eosio::multi_index<"freceipts"_n, compressed_messages_receipt_t> compressed_foreign_receipts_table_t; \
typedef eosio::singleton<"cfreceipts"_n, messages_receipt_t> current_foreign_receipts_table_t; \
typedef eosio::multi_index<"cfreceipts"_n, messages_receipt_t> current_foreign_receipts_table_abi; \
typedef eosio::multi_index<"ffreceipts"_n, failed_receipt_t> failed_foreign_receipts_table_t; \
typedef eosio::multi_index<"releases"_n, compressed_releases_t> compressed_releases_table_t; \
typedef eosio::singleton<"creleases"_n, releases_t> current_releases_table_t; \
typedef eosio::multi_index<"creleases"_n, releases_t> current_releases_table_abi; \
typedef eosio::multi_index<"cmessages"_n, confirmed_messages_t> confirmed_messages_table_t; \
typedef eosio::multi_index<"pmessages"_n, pending_messages_t> pending_messages_table_t; \
typedef eosio::multi_index<"preceipts"_n, pending_receipts_t> pending_receipts_table_t;\
typedef eosio::multi_index<"creceipts"_n, compressed_messages_receipt_t> confirmed_receipts_table_t;\
void initlink( \
  name sister_code, \
  string sister_chain_name, \
  string this_chain_name, \
  bool processing_enabled, \
  uint64_t last_irreversible_block_time, \
  uint64_t last_received_releases_id, \
  uint64_t last_received_receipts_id, \
  uint64_t last_confirmed_messages_id, \
  uint64_t last_pending_messages_id \
  ) \
{ \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  settings.sister_code = sister_code; \
  settings.sister_chain_name = sister_chain_name; \
  settings.this_chain_name = sister_chain_name; \
  settings.processing_enabled = processing_enabled; \
  settings.last_irreversible_block_time = last_irreversible_block_time; \
  settings.last_received_releases_id = last_received_releases_id; \
  settings.last_received_receipts_id = last_received_receipts_id; \
  settings.last_confirmed_messages_id = last_confirmed_messages_id; \
  settings.last_pending_messages_id = last_pending_messages_id; \
  settings_singleton.set(settings, _self); \
  if (processing_enabled) { \
    schedule_timer(name("cnfrmblock"), vector<char>(), 20); \
    schedule_timer(name("getreleases"), vector<char>(), 20); \
    schedule_timer(name("getreceipts"), vector<char>(), 20); \
    schedule_timer(name("hndlreceipt"), vector<char>(), 20); \
    schedule_timer(name("hndlrelease"), vector<char>(), 20); \
  }\
}\
void enablelink(bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled) { \
    schedule_timer(name("cnfrmblock"), vector<char>(), 20); \
    schedule_timer(name("getreleases"), vector<char>(), 20); \
    schedule_timer(name("getreceipts"), vector<char>(), 20); \
    schedule_timer(name("hndlreceipt"), vector<char>(), 20); \
    schedule_timer(name("hndlrelease"), vector<char>(), 20); \
  } \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self);\
}\
bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){ \
    auto _self = name(current_receiver()); \
    settings_table settings_singleton(_self, _self.value); \
    settings_t settings = settings_singleton.get_or_default(); \
    check(settings.processing_enabled, "processing disabled"); \
    if (timer.to_string() == "cnfrmblock") return handle_confirm_block(); \
    else if (timer.to_string() == "getreleases") return handle_get_releases(); \
    else if (timer.to_string() == "getreceipts") return handle_get_receipts(); \
    else if (timer.to_string() == "hndlreceipt") return handle_receipt(); \
    else if (timer.to_string() == "hndlrelease") return handle_release(); \
    else eosio::check(false, "unrecognized timer name: " + timer.to_string()); \
    return false; \
}\
bool handle_receipt() {\
    auto _self = name(current_receiver());\
    auto current_block_time = eosio::current_time_point().sec_since_epoch();\
    settings_table settings_singleton(_self, _self.value);\
    settings_t settings = settings_singleton.get_or_default();\
    current_foreign_receipts_table_t foreign_receipts_singleton(_self, _self.value);\
    messages_receipt_t current_receipts = foreign_receipts_singleton.get_or_default();\
    vector<message_receipt> pending_receipts = current_receipts.message_receipts;\
    if (pending_receipts.size() == 0) {\
        compressed_foreign_receipts_table_t compressed_foreign_receipts(_self, _self.value);\
        auto cf_receipts = compressed_foreign_receipts.find(current_receipts.id + 1);\
        eosio::check(cf_receipts != compressed_foreign_receipts.end(), "no pending receipts");\
        pending_receipts = ipfs_svc_helper::getData<vector<message_receipt>>(cf_receipts->receipts_uri);\
        current_receipts.id += 1;\
        current_receipts.received_block_time = cf_receipts->received_block_time;\
    } else {\
        auto current_receipt = pending_receipts[0];\
        pending_receipts.erase(pending_receipts.begin());\
        if(current_receipts.last_success_block_time + LINK_PROCESSING_TIMEOUT <= current_block_time) {\
            MESSAGE_RECEIPT_FAILURE_HOOK(current_receipt)\
            failed_foreign_receipts_table_t failed_foreign_receipts(_self, _self.value);\
            failed_foreign_receipts.emplace(_self, [&]( auto& a ){\
                a.id = failed_foreign_receipts.available_primary_key();\
                a.failed_receipt = current_receipt;\
                a.receipts_id = current_receipts.id;\
                a.failed_block_time = current_block_time;\
            });\
        } else {\
            MESSAGE_RECEIPT_HOOK(current_receipt)\
        }\
    }\
    current_receipts.message_receipts = pending_receipts;\
    current_receipts.last_success_block_time = current_block_time;\
    foreign_receipts_singleton.set(current_receipts, _self);\
    return settings.processing_enabled;\
}\
bool handle_release() {\
    auto _self = name(current_receiver());\
    auto current_block_time = eosio::current_time_point().sec_since_epoch();\
    current_releases_table_t releases_singleton(_self, _self.value);\
    releases_t current_releases = releases_singleton.get_or_default();\
    settings_table settings_singleton(_self, _self.value);\
    settings_t settings = settings_singleton.get_or_default();\
    vector<message_payload> pending_releases = current_releases.releases;\
    if (pending_releases.size() == 0) {\
        compressed_releases_table_t compressed_releases(_self, _self.value);\
        auto c_release = compressed_releases.find(current_releases.id + 1);\
        bool retrieve_release = c_release != compressed_releases.end();\
        eosio::check(retrieve_release, "no pending releases");\
        pending_releases = ipfs_svc_helper::getData<vector<message_payload>>(c_release->releases_uri);\
        current_releases.id = c_release->id;\
        current_releases.received_block_time = c_release->received_block_time;\
    } else { \
        message_receipt current_receipt;\
        auto current_release = pending_releases[0];\
        pending_releases.erase(pending_releases.begin());\
        if(current_releases.last_success_block_time + LINK_PROCESSING_TIMEOUT <= current_block_time) {\
            vector<char> hook_response = MESSAGE_RECEIVED_FAILURE_HOOK(current_release)\
            current_receipt = {current_release.data,hook_response,false};\
        } else {\
            vector<char> hook_response = MESSAGE_RECEIVED_HOOK(current_release)\
            current_receipt = {current_release.data,hook_response,true};\
        }\
        push_receipt(current_receipt);\
    }\
    current_releases.releases = pending_releases;\
    current_releases.last_success_block_time = current_block_time;\
    releases_singleton.set(current_releases, _self);\
    return settings.processing_enabled;\
}