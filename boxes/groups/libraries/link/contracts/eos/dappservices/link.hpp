#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/ipfs.hpp"

#define LINK_RECEIPT_FLAG 0x80000000


#ifndef LINK_BATCH_SIZE
#define LINK_BATCH_SIZE 5
#endif

#ifdef LINK_PROTOCOL_ETHEREUM
#include "../dappservices/sign.hpp"
#undef LINK_BATCH_SIZE
#define LINK_BATCH_SIZE 1
#ifndef DAPPSERVICES_ACTIONS
#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  CRON_DAPPSERVICE_ACTIONS \
  IPFS_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS \
  SIGN_DAPPSERVICE_ACTIONS
#endif
#ifndef DAPPSERVICE_ACTIONS_COMMANDS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()IPFS_SVC_COMMANDS()SIGN_SVC_COMMANDS() 
#endif
#define PUSH_FOREIGN_MESSAGE_METHOD_ID "7d29a9f0" // push foreign method
#define BYTES_ARRAY_POINTER_PUSH_FOREIGN_MESSAGE "0000000000000000000000000000000000000000000000000000000000000040"
#else
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
#endif

// define custom filter
#undef ORACLE_HOOK_FILTER
#define ORACLE_HOOK_FILTER(uri, data) filter_result(uri, data);
#define emptyentry() vector<char>()

#ifndef LINK_PROCESSING_TIMEOUT
#define LINK_PROCESSING_TIMEOUT 60
#endif

#ifndef LINK_CRON_INTERVAL
#define LINK_CRON_INTERVAL 5 //20
#endif

#ifndef LINK_PROVIDER_THRESHOLD
#define LINK_PROVIDER_THRESHOLD 1
#endif

#define MESSAGE_RECEIVED_HOOK(message) error_needs_to_be_defined_dummy_received(message)
#define MESSAGE_RECEIVED_FAILURE_HOOK(message) error_needs_to_be_defined_dummy_received(message)
#define MESSAGE_RECEIPT_HOOK(receipt) error_needs_to_be_defined_dummy_receipt(receipt)
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) error_needs_to_be_defined_dummy_receipt(receipt)

struct message_payload {
    uint64_t id;
    vector<char> data;
};

std::vector<char> dummy_received(const std::vector<char>& message) {return emptyentry();}
void dummy_receipt(const std::vector<char>& receipt) {}

struct state_params {
    uint64_t last_irreversible_block_time;
    uint64_t available_message_id;
    uint64_t available_batch_id;
    uint64_t next_inbound_batch_id;
};

TABLE settings_t {
    string sister_address;      // name of corresponding bridge for oracle queries
    string sister_msig_address; // name of corresponding bridge for oracle queries
    string sister_chain_name;   // chain ID
    string this_chain_name;     //name of this chain for irreversability query

    bool processing_enabled;
    uint64_t last_irreversible_block_time;
    uint64_t last_pushed_batch_id;
    uint64_t available_message_id;
    uint64_t available_batch_id;
    uint64_t next_inbound_batch_id;
};

typedef eosio::singleton<"settings"_n, settings_t> settings_table;
typedef eosio::multi_index<"settings"_n, settings_t> settings_table_abi;

// contains all transfers with given timestamp
TABLE pending_messages_t {
    message_payload message;
    uint32_t received_block_time;
    uint64_t primary_key()const { return message.id; }
    uint64_t by_time()const { return received_block_time; }
};

// contains all transfers with given timestamp
TABLE batched_messages_t {
    message_payload message;  
    uint64_t batch_id;
    uint32_t batched_block_time;
    uint64_t primary_key()const { return message.id; }
    uint64_t by_time()const { return batched_block_time; }
    uint64_t by_batch()const { return batch_id; }
};

// this shouldn't be a table but rather an ipfs pointer
TABLE message_batches_t {
    uint64_t batch_id;    
    uint64_t batched_block_time;
    string messages_uri;
    uint64_t primary_key()const { return batch_id; }
};

typedef eosio::multi_index<"pmessages"_n, pending_messages_t, 
indexed_by<"bytime"_n, const_mem_fun<pending_messages_t, uint64_t, &pending_messages_t::by_time>>> pending_messages_table_t;

typedef eosio::multi_index<"bmessages"_n, batched_messages_t, 
indexed_by<"bytime"_n, const_mem_fun<batched_messages_t, uint64_t, &batched_messages_t::by_time>>, 
indexed_by<"bybatch"_n, const_mem_fun<batched_messages_t, uint64_t, &batched_messages_t::by_batch>>> batched_messages_table_t;

typedef eosio::multi_index<"imessages"_n, pending_messages_t, 
indexed_by<"bytime"_n, const_mem_fun<pending_messages_t, uint64_t, &pending_messages_t::by_time>>> inbound_messages_table_t;

typedef eosio::multi_index<"fmessages"_n, pending_messages_t, 
indexed_by<"bytime"_n, const_mem_fun<pending_messages_t, uint64_t, &pending_messages_t::by_time>>> failed_messages_table_t;

typedef eosio::multi_index<"batches"_n, message_batches_t>  batches_table_t;
typedef eosio::multi_index<"fbatches"_n, message_batches_t>  failed_batches_table_t;
typedef eosio::multi_index<"ibatches"_n, message_batches_t>  inbound_batches_table_t;

typedef eosio::singleton<"ibatch"_n, message_batches_t>  inbound_batch_t;
typedef eosio::singleton<"imessage"_n, pending_messages_t>  inbound_message_t;


// we only want to receive a non-empty manifest uri
// we also get last irreversible block, should check that it's new
void filter_result(std::vector<char> uri, std::vector<char> data) {
    // need to hardcode for optimization?
    std::vector emptyDataHash = uri_to_ipfsmultihash(ipfs_svc_helper::setRawData(emptyentry(), true));
    check(data != emptyDataHash, "{abort_service_request}");
}

// Oracle to confirm local irreversibility
uint64_t get_last_irreversible_block(string chain_name) {
    #ifndef LINK_DEBUG
    string last_irreversible_uri_string = "sister_chain_last_irreversible://" + chain_name;
    vector<char> last_irreversible_uri(last_irreversible_uri_string.begin(), last_irreversible_uri_string.end());
    auto irreversible_time = oracle_svc_helper::getURI(last_irreversible_uri, [&]( auto& results ) {
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        //We retrieve the minimum result to prevent manipulation
        uint64_t min_irreversible = std::stoull(string(results[0].result.begin(),results[0].result.end()));
        int selectedIdx = 0;
        for(int idx = 1; idx < results.size(); idx++) {
            uint64_t last_irreversible = std::stoull(string(results[idx].result.begin(),results[idx].result.end()));
            if(last_irreversible < min_irreversible) {
                min_irreversible = last_irreversible;
                selectedIdx = idx;
            }
        }
        return results[selectedIdx].result;
    });
    return std::stoull(string(irreversible_time.begin(),irreversible_time.end()));
    #else
    return eosio::current_time_point().sec_since_epoch();
    #endif
}


#ifdef LINK_PROTOCOL_ETHEREUM
std::string pad_left(std::string data) {
    std::string s(64 - data.size(), '0');
    return s.append(data);
}
std::string pad_right(std::string data) {
    auto diff = 64 - (data.size() % 64);
    std::string s(diff, '0');
    return data.append(s);
}

std::string data_to_hex_string(vector<char> data)
{
    std::string s(data.size() * 2, ' ');
    char hexmap[] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};
    for (int i = 0; i < data.size(); ++i) {
        s[2 * i]     = hexmap[(data[i] & 0xF0) >> 4];
        s[2 * i + 1] = hexmap[data[i] & 0x0F];
    }
    return s;
}

template <typename I> std::string n2hexstr(I w, size_t hex_len = sizeof(I)<<1) {
    static const char* digits = "0123456789ABCDEF";
    std::string rc(hex_len,'0');
    for (size_t i=0, j=(hex_len-1)*4 ; i<hex_len; ++i,j-=4)
        rc[i] = digits[(w>>j) & 0x0f];
    return rc;
}

void push_eth_message(uint64_t message_id, std::string chain_name, std::string dest_address, std::string sister_address, vector<char> payload)
{    
    string message_id_string = pad_left(n2hexstr<uint64_t>(message_id));
    string payload_string = data_to_hex_string(payload);
    string payload_length_string = pad_left(n2hexstr<uint64_t>(payload_string.length() / 2));

    std::string data = string(PUSH_FOREIGN_MESSAGE_METHOD_ID) +\
    message_id_string +\
    BYTES_ARRAY_POINTER_PUSH_FOREIGN_MESSAGE +\
    payload_length_string +\
    pad_right(payload_string);

    std::string id = fc::to_string(message_id);
    std::string chain_type = "ethereum";
    std::string account = "signservice1"; //TODO: define this somewhere? is defined at compilation in dappservices?
    sign_svc_helper::svc_sign_signtrx(id, sister_address, data, chain_name, chain_type, account, 1);
}

bool handle_push_messages() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    batches_table_t batches(_self, _self.value);

    // confirmed_messages_table_t confirmed_messages(_self, _self.value);
    auto current_batch = batches.find(settings.last_pushed_batch_id);
    eosio::check(current_batch != batches.end(), "{abort_service_request}");
    auto current_messages = ipfs_svc_helper::getData<vector<message_payload>>(current_batch->messages_uri);
    auto curr_payload = current_messages.begin();
    while(curr_payload != current_messages.end()) {
        // do we need to filter by blocktime again?
        push_eth_message(
            current_batch->batch_id, 
            settings.sister_chain_name, 
            settings.sister_msig_address, 
            settings.sister_address, 
            curr_payload->data
        );
        curr_payload++;
    }
    
    settings.last_pushed_batch_id += 1;
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}
#endif

// oracle fetch batches from eth/sister chain
bool handle_get_batches() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    // create uri string for oracle request
    #ifdef LINK_PROTOCOL_ETHEREUM
        string batches_abi = "{\"method_name\":\"getBatch\",\"input_type\":\"uint64\",\"outputs\":[{\"name\":\"id\",\"type\":\"uint256\"},{\"name\":\"data\",\"type\":\"bytes\"},{\"name\":\"block_num\",\"type\":\"uint256\"}]}";
        string uri_string =
            "eth_contract_call://"
            + settings.sister_chain_name + "/" // chain name = chain id
            + settings.sister_address + "/"
            + batches_abi + "/"
            + fc::to_string(settings.next_inbound_batch_id) + "/"
            + "message_payload/";
    #else // sister_chain_table_row://chain/code/table/scope/key/field
        string uri_string =
            "sister_chain_table_row://"
            + settings.sister_chain_name + "/"
            + settings.sister_address + "/"
            + "batches/"
            + settings.sister_address + "/"
            + fc::to_string(settings.next_inbound_batch_id) + "/"
            + "messages_uri/";
    #endif
    vector<char> uri(uri_string.begin(), uri_string.end());
    vector<char> messages_uri = oracle_svc_helper::getURI(uri, [&]( auto& results ) {
        // require at least LINK_PROVIDER_THRESHOLD DSP responses
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        // take first result, could randomize
        return results[0].result;
    });
    // if ETH unpack payload and store in IPFS
    #ifdef LINK_PROTOCOL_ETHEREUM
        message_payload payload = eosio::unpack<message_payload>(messages_uri);
        vector<message_payload> new_message{ payload };
        string messages_uri_string = ipfs_svc_helper::setData(new_message);
    #else // else populate message uri as string ipfs://
        string messages_uri_string(messages_uri.begin(), messages_uri.end());
    #endif
    // add to ibatches table
    inbound_batches_table_t batches_table(_self, _self.value);
    batches_table.emplace(_self, [&]( auto& a ){
        a.messages_uri = messages_uri_string; // ipfs:// hash
        a.batch_id = settings.next_inbound_batch_id;
        a.batched_block_time = eosio::current_time_point().sec_since_epoch();
    });
    // update inbound batch id settings
    settings.next_inbound_batch_id++;
    settings_singleton.set(settings, _self);
    // if processing enabled, reschedule cron
    return settings.processing_enabled;
}

// unpack batches fetched on getbatches cron
bool handle_unpack_batches() {
    auto _self = name(current_receiver());
    auto current_block_time = eosio::current_time_point().sec_since_epoch();
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    // get ibatch singleton 
    inbound_batch_t batch_singleton(_self, _self.value);
    // if it does not exist, check ibatches table for batch
    if(!batch_singleton.exists()) {
        // get ibatches table
        inbound_batches_table_t batches_table(_self, _self.value);
        auto batch = batches_table.begin();
        // if no batch in ibatches abort service request, spend no CPU
        check(batch != batches_table.end(), "{abort_service_request}" );
        // set ibatch singleton, erase from ibatches table
        auto next_batch = *batch;
        next_batch.batched_block_time = current_block_time;
        batch_singleton.set(next_batch, _self);
        batches_table.erase(batch);
    } else { // if singleton exists, get
        auto batch = batch_singleton.get();
        // if time since converted to ibatch from ibatches + LINK_PROCESSING_TIMEOUT > curr time
        // fetch data from IPFS
        // there is a window here, if a msg isn't processed within that window, the batch isn't handled
        if(batch.batched_block_time + LINK_PROCESSING_TIMEOUT > current_block_time) {
            // imessages table
            inbound_messages_table_t inbound_messages(_self, _self.value);
            // fetch from IPFS using ipfs:// hash
            auto messages = ipfs_svc_helper::getData<vector<message_payload>>(batch.messages_uri);
            auto new_message = messages.begin();
            while(new_message != messages.end()) {
                // add to imessages table for each batched message
                inbound_messages.emplace(_self, [&]( auto& a ){
                    a.message = *new_message;
                    a.received_block_time = current_block_time;
                });
                new_message++;
            }
        } else {
            // pull fbatches table, add failed batch
            failed_batches_table_t failed_batches(_self, _self.value);
            auto failed = failed_batches.find(batch.batch_id);
            if(failed == failed_batches.end()) {
                failed_batches.emplace(_self, [&](auto& a){
                    a.batch_id = batch.batch_id;
                    a.batched_block_time = batch.batched_block_time;
                    a.messages_uri = batch.messages_uri;
                });
            }
        }
        // delete ibatch ready for new entry
        batch_singleton.remove();
    }
    // update settings
    settings_singleton.set(settings, _self);
    // if processing enabled, reschedule cron
    return settings.processing_enabled;
}


bool handle_pack_batches() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();

    // pull pmessages table for pending messages that were pushed from overloaded transfer
    pending_messages_table_t pending_messages(_self, _self.value);
    // pull bmessages table to populate with LINK_BATCH_SIZE batches once msg passes LIB check
    batched_messages_table_t batched_messages(_self, _self.value);
    // order pending messages by time
    auto ordered_pending_messages = pending_messages.get_index<"bytime"_n>();
    // set iterator for first msg by time
    auto p_messages = ordered_pending_messages.begin();
    // if no pending messages, abort request, entire trx rolled back
    eosio::check(p_messages != ordered_pending_messages.end(), "{abort_service_request}");
    // if message received after last recorded LIB, update LIB
    if(p_messages->received_block_time > settings.last_irreversible_block_time) {
        uint64_t new_irreversible_block_time = get_last_irreversible_block(settings.this_chain_name);
        // if LIB progressed from last recorded, update
        if(new_irreversible_block_time > settings.last_irreversible_block_time) {
            settings.last_irreversible_block_time = new_irreversible_block_time;  
        }
    }

    //Populate the batch
    auto messages = vector<message_payload>();
    // count to ensure LINK_BATCH_SIZE is not exceeded
    uint8_t count = 0;
    // while pending msgs exist, push up to LINK_BATCH_SIZE batches
    while(p_messages != ordered_pending_messages.end() && count < LINK_BATCH_SIZE) {
        // if msg received after LIB, else break loop
        if(p_messages->received_block_time <= settings.last_irreversible_block_time) {
            // add msg to be added to IPFS
            messages.push_back(p_messages->message);
            // if pending message is a message and not a receipt add to bmessages table
            if(p_messages->message.id < LINK_RECEIPT_FLAG) {
                //Receipts may be deleted immediately
                //We do not require a receipt for a receipt
                //Messages however are saved, to be cleared when a receipt is received or timeout is met
                // add to bmessages table
                batched_messages.emplace(_self, [&](auto& a){
                    a.message = p_messages->message;
                    a.batch_id = settings.available_batch_id;
                    a.batched_block_time = eosio::current_time_point().sec_since_epoch();
                });
            }
            // erase pending message or receipt
            p_messages = ordered_pending_messages.erase(p_messages);
            // increase count for total batch size
            count++;
        } else {
            // break while loop
            p_messages = ordered_pending_messages.end();
        }      
    }

    //Create the populated batch
    if(messages.size() > 0) {
        // save message to IPFS
        auto messages_uri = ipfs_svc_helper::setData(messages);
        // add to batches table
        batches_table_t batches(_self, _self.value);
        batches.emplace(_self, [&](auto& a){
            a.batch_id = settings.available_batch_id;
            a.batched_block_time = eosio::current_time_point().sec_since_epoch();
            a.messages_uri = messages_uri;
        });
        // increment available batch id
        settings.available_batch_id++;
    }
    
    //Update settings
    settings_singleton.set(settings, _self);
    // if processing enabled, reschedule cron
    return settings.processing_enabled;
}

bool handle_receipt(const message_payload& payload, const bool failed = false) {
    auto _self = name(current_receiver());
    // pull bmessages table 
    batched_messages_table_t batched_messages(_self, _self.value);
    // create id that will indicate payload is a receipt and not a message
    auto messageId = payload.id - LINK_RECEIPT_FLAG; // indicate when read that message is a receipt
    auto outgoing = batched_messages.find(messageId);
    if(outgoing != batched_messages.end()) {       
        if(failed) {
            // pull fmessages table 
            failed_messages_table_t failed_messages(_self, _self.value);
            auto failed = failed_messages.find(payload.id);
            if(failed == failed_messages.end()) {
                failed_messages.emplace(_self, [&](auto& a){
                    a.message = payload;
                    a.received_block_time = eosio::current_time_point().sec_since_epoch();
                });
            }
        }
        auto batch_id = outgoing->batch_id;
        batched_messages.erase(outgoing);
        auto batched_together = batched_messages.get_index<"bybatch"_n>();
        auto remaining = batched_together.find(batch_id);
        if(remaining == batched_together.end()) {
            //erase the batch itself from batches table
            batches_table_t batches_table(_self, _self.value);
            auto batch = batches_table.find(batch_id);
            if(batch != batches_table.end()) batches_table.erase(batch);
        }
        return true;
    }    
    return false;
}

void pushMessage(std::vector<char> data, uint64_t force_message_id = 0) {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();    
    auto message_id = force_message_id;
    // if no id enforced, assign message id from settings table
    if(force_message_id == 0) {
        message_id = settings.available_message_id;
        // increment settings for next message id
        settings.available_message_id++;
    }
    pending_messages_table_t pending_messages(_self, _self.value);
    pending_messages.emplace(_self, [&]( auto& a ){
        // add pending message with message_id and packed data
        a.message = message_payload{message_id, data};
        // fetch current block time
        a.received_block_time = eosio::current_time_point().sec_since_epoch();
    });
    // update settings
    settings_singleton.set(settings, _self);
}


#ifdef LINK_PROTOCOL_ETHEREUM
#define LINK_HANDLE_ETH_JOBS()\
    if (timer.to_string() == "pushbatches") return handle_push_messages();
    
#define LINK_INIT_METHODS()\
void initlink( \
    string sister_address,\
    string sister_msig_address,\
    string sister_chain_name,\
    string this_chain_name,\
    bool processing_enabled) \
{ \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  settings.sister_address = sister_address; \
  settings.sister_msig_address = sister_msig_address; \
  settings.sister_chain_name = sister_chain_name; \
  settings.this_chain_name = this_chain_name; \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self); \
  enablelink(processing_enabled);\
}\
void enablelink(bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled) { /* schedule all eth timers */ \
    start_interval(name("packbatches"), vector<char>(), LINK_CRON_INTERVAL); /* pack pending messages (pmessages) to batched messages (bmessages) after finality check passes  */ \
    start_interval(name("getbatches"), vector<char>(), LINK_CRON_INTERVAL); /* fetch ETH batches */ \
    start_interval(name("unpkbatches"), vector<char>(), LINK_CRON_INTERVAL); /* unpack messages from getbatches */ \
    start_interval(name("hndlmessage"), vector<char>(), LINK_CRON_INTERVAL); /* handle message / recipt success / failure from unpacked msg */ \
    start_interval(name("pushbatches"), vector<char>(), LINK_CRON_INTERVAL); /* push eth sign service request */ \
  } \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self);\
}\
void disablelink(name timer, bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled == false) { /* schedule all eth timers */ \
    remove_interval(timer); \
  } \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self);\
}
#else
#define LINK_HANDLE_ETH_JOBS()
#define LINK_INIT_METHODS()\
void initlink( \
  name sister_code, \
  string sister_chain_name, \
  string this_chain_name, \
  bool processing_enabled) \
{ \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  settings.sister_address = sister_code.to_string(); \
  settings.sister_chain_name = sister_chain_name; \
  settings.this_chain_name = this_chain_name; \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self); \
  enablelink(processing_enabled);\
}\
void enablelink(bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled) { /* schedule all timers */ \
    start_interval(name("packbatches"), vector<char>(), LINK_CRON_INTERVAL); /* pack pending messages (pmessages) to batched messages (bmessages) after finality check passes  */ \
    start_interval(name("getbatches"), vector<char>(), LINK_CRON_INTERVAL); /* fetch ETH batches */ \
    start_interval(name("unpkbatches"), vector<char>(), LINK_CRON_INTERVAL); /* unpack messages from getbatches */ \
    start_interval(name("hndlmessage"), vector<char>(), LINK_CRON_INTERVAL); /* handle message / recipt success / failure from unpacked msg */ \
  } \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self);\
}\
void disablelink(name timer, bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled == false) { /* remove all timers */ \
    remove_interval(timer); \
  } \
  settings.processing_enabled = processing_enabled; \
  settings_singleton.set(settings, _self);\
}
#endif

#define LINK_BOOTSTRAP() \
TABLE settings_t {\
    string sister_address;\
    string sister_msig_address;\
    string sister_chain_name;\
    string this_chain_name;\
    bool processing_enabled;\
    uint64_t last_irreversible_block_time;\
    uint64_t last_pushed_batch_id;\
    uint64_t available_message_id;\
    uint64_t available_batch_id;\
    uint64_t next_inbound_batch_id;\
};\
TABLE pending_messages_t {\
    message_payload message;\
    uint32_t received_block_time;\
    uint64_t primary_key()const { return message.id; }\
    uint64_t by_time()const { return received_block_time; }\
};\
TABLE batched_messages_t {\
    message_payload message;\
    uint64_t batch_id;\
    uint32_t batched_block_time;\
    uint64_t primary_key()const { return message.id; }\
    uint64_t by_time()const { return batched_block_time; }\
    uint64_t by_batch()const { return batch_id; }\
};\
TABLE message_batches_t {\
    uint64_t batch_id;\
    uint64_t batched_block_time;\
    string messages_uri;\
    uint64_t primary_key()const { return batch_id; }\
};\
typedef eosio::singleton<"settings"_n, settings_t> settings_table;\
typedef eosio::multi_index<"settings"_n, settings_t> settings_table_abi;\
typedef eosio::multi_index<"pmessages"_n, pending_messages_t, \
indexed_by<"bytime"_n, const_mem_fun<pending_messages_t, uint64_t, &pending_messages_t::by_time>>> pending_messages_table_t;\
typedef eosio::multi_index<"bmessages"_n, batched_messages_t, \
indexed_by<"bytime"_n, const_mem_fun<batched_messages_t, uint64_t, &batched_messages_t::by_time>>, \
indexed_by<"bybatch"_n, const_mem_fun<batched_messages_t, uint64_t, &batched_messages_t::by_batch>>> batched_messages_table_t;\
typedef eosio::multi_index<"imessages"_n, pending_messages_t, \
indexed_by<"bytime"_n, const_mem_fun<pending_messages_t, uint64_t, &pending_messages_t::by_time>>> inbound_messages_table_t;\
typedef eosio::multi_index<"fmessages"_n, pending_messages_t, \
indexed_by<"bytime"_n, const_mem_fun<pending_messages_t, uint64_t, &pending_messages_t::by_time>>> failed_messages_table_t;\
typedef eosio::multi_index<"batches"_n, message_batches_t>  batches_table_t;\
typedef eosio::multi_index<"fbatches"_n, message_batches_t>  failed_batches_table_t;\
typedef eosio::multi_index<"ibatches"_n, message_batches_t>  inbound_batches_table_t;\
typedef eosio::singleton<"ibatch"_n, message_batches_t>  inbound_batch_t;\
typedef eosio::singleton<"imessage"_n, pending_messages_t>  inbound_message_t;\
typedef eosio::multi_index<"ibatch"_n, message_batches_t>  inbound_batch_abi_t;\
typedef eosio::multi_index<"imessage"_n, pending_messages_t>  inbound_message_abi_t;\
LINK_INIT_METHODS()\
bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){ \
    auto _self = name(current_receiver()); \
    settings_table settings_singleton(_self, _self.value); \
    settings_t settings = settings_singleton.get_or_default(); \
    check(settings.processing_enabled, "processing disabled"); \
    LINK_HANDLE_ETH_JOBS()\
    if (timer.to_string() == "packbatches") return handle_pack_batches(); \
    else if (timer.to_string() == "getbatches") return handle_get_batches(); \
    else if (timer.to_string() == "unpkbatches") return handle_unpack_batches(); \
    else if (timer.to_string() == "hndlmessage") return handle_message(); \
    else eosio::check(false, "unrecognized timer name: " + timer.to_string()); \
    return false; \
}\
bool handle_message() {\
    auto _self = name(current_receiver());\
    auto current_block_time = eosio::current_time_point().sec_since_epoch();\
    settings_table settings_singleton(_self, _self.value);\
    settings_t settings = settings_singleton.get_or_default();\
    inbound_message_t message_singleton(_self, _self.value); /* pull imessage singleton */\
    if(!message_singleton.exists()) { /* if doesn't exist try pulling from imessages table */\
        inbound_messages_table_t inbound_messages(_self, _self.value); /* imessage singleton */\
        auto ordered_messages = inbound_messages.get_index<"bytime"_n>();\
        auto message = ordered_messages.begin();\
        eosio::check(message != ordered_messages.end(), "{abort_service_request}"); /* if no entry abort service request */\
        auto next_message = *message;\
        next_message.received_block_time = current_block_time;\
        message_singleton.set(next_message, _self);\
        ordered_messages.erase(message);\
    } else {\
        auto message = message_singleton.get();\
        auto payload = message.message;\
        if(message.received_block_time + LINK_PROCESSING_TIMEOUT > current_block_time) { /* message received between imessage singleton creation and 60s after, if not considered failed */\
            if(payload.id < LINK_RECEIPT_FLAG) { /* if payload is a message and not a receipt */\
                pushMessage(MESSAGE_RECEIVED_HOOK(payload.data), payload.id + LINK_RECEIPT_FLAG);\
            } else { /* if receipt in bmessages table to erase, erase, if batch to erase, erase as well, run MESSAGE_RECEIPT_HOOK, otherwise don't */\
                if(handle_receipt(payload)) MESSAGE_RECEIPT_HOOK(payload.data);\
            }\
        } else { /* if message not handled witihin time imessage received and the LINK_PROCESSING_TIMEOUT, handle failure */\
            if(payload.id < LINK_RECEIPT_FLAG) { /* if payload is a message, if payload id greater than LINK_RECEIPT_FLAG would indicate receipt */\
                pushMessage(MESSAGE_RECEIVED_FAILURE_HOOK(payload.data), payload.id + LINK_RECEIPT_FLAG);\
            } else { /* is receipt, handle then fire failure hook */\
                if(handle_receipt(payload)) MESSAGE_RECEIPT_FAILURE_HOOK(payload);\
            }\
        }\
        message_singleton.remove();\
    }\
    return settings.processing_enabled;\
}\
void setlinkstate (state_params new_state) {\
    auto _self = name(current_receiver()); \
    require_auth(_self);\
    settings_table settings_singleton(_self, _self.value); \
    settings_t settings = settings_singleton.get_or_default(); \
    settings.last_irreversible_block_time = new_state.last_irreversible_block_time; \
    settings.available_message_id = new_state.available_message_id; \
    settings.available_batch_id = new_state.available_batch_id; \
    settings.next_inbound_batch_id = new_state.next_inbound_batch_id; \
}