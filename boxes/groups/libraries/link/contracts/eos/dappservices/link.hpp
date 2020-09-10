#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/ipfs.hpp"

#ifdef LINK_PROTOCOL_ETHEREUM
#include "../dappservices/sign.hpp"
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
#define PUSH_FOREIGN_MESSAGE_METHOD_ID "1466c771"
#define PUSH_FOREIGN_RECEIPT_METHOD_ID "587cc509"
#define BYTES_ARRAY_POINTER_PUSH_FOREIGN_MESSAGE "0000000000000000000000000000000000000000000000000000000000000040"
#define PAYLOAD_SIZE_PUSH_FOREIGN_MESSAGE "0000000000000000000000000000000000000000000000000000000000000060"
#define BYTES_ARRAY_POINTER_PUSH_FOREIGN_RECEIPT_DATA "0000000000000000000000000000000000000000000000000000000000000080"
#define BYTES_ARRAY_POINTER_PUSH_FOREIGN_RECEIPT_RESPONSE "0000000000000000000000000000000000000000000000000000000000000100"
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

struct state_params {
    uint64_t last_irreversible_block_time;
    uint64_t last_pushed_messages_id;
    uint64_t last_pushed_receipts_id;
    uint64_t last_received_messages_id;
    uint64_t last_received_receipts_id;
    uint64_t last_confirmed_messages_id;
    uint64_t last_pending_messages_id;
    uint64_t last_confirmed_receipts_id;
    uint64_t last_pending_receipts_id;
};

TABLE settings_t {
    string sister_address; // name of corresponding bridge for oracle queries
    string sister_msig_address; // name of corresponding bridge for oracle queries
    string sister_chain_name; // chain ID
    string this_chain_name; //name of this chain for irreversability query
    bool processing_enabled;
    uint64_t last_irreversible_block_time;
    uint64_t last_pushed_messages_id; 
    uint64_t last_pushed_receipts_id; 
    uint64_t last_received_messages_id;
    uint64_t last_received_receipts_id;
    uint64_t last_confirmed_messages_id;
    uint64_t last_pending_messages_id;
    uint64_t last_confirmed_receipts_id;
    uint64_t last_pending_receipts_id;
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
TABLE foreign_messages_t {
    uint64_t id;
    std::vector<message_payload> fmessages;
    uint64_t received_block_time; // time instead of block
    uint64_t last_success_block_time; //increment this with each successful hndlrelease
};
TABLE compressed_fmessages_t {
    uint64_t id;
    string fmessages_uri;
    uint64_t received_block_time; // time instead of block
    uint64_t primary_key()const {return id;}
};
typedef eosio::multi_index<"fmessages"_n, compressed_fmessages_t> compressed_fmessages_table_t;
typedef eosio::singleton<"cfmessages"_n, foreign_messages_t> current_fmessages_table_t;
typedef eosio::multi_index<"cfmessages"_n, foreign_messages_t> current_fmessages_table_abi;

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
    // TODO: don't forget to fix this, casting doesn't work as expected
    vector<char> last_irreversible_uri(last_irreversible_uri_string.begin(), last_irreversible_uri_string.end());
    vector<char> last_irreversible_result = oracle_svc_helper::getURI(last_irreversible_uri, [&]( auto& results ) {
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        return results[0].result;
    });
    uint64_t last_irreversible = std::stoull(string(last_irreversible_result.begin(),last_irreversible_result.end()));
    return last_irreversible;
}


#ifdef LINK_PROTOCOL_ETHEREUM
std::string pad_left(std::string data) {
    std::string s(64 - data.size(), '0');
    return s.append(data);
}
std::string clean_eth_address(std::string address) {
    // remove initial 0x if there
    if (address[1] == 'x') {
        return address.substr(2);
    }
    return address;
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
    string payload_string = data_to_hex_string(payload);
    string message_id_string = pad_left(n2hexstr<uint64_t>(message_id));

    std::string data = string(PUSH_FOREIGN_MESSAGE_METHOD_ID) +\
    BYTES_ARRAY_POINTER_PUSH_FOREIGN_MESSAGE +\
    message_id_string +\
    PAYLOAD_SIZE_PUSH_FOREIGN_MESSAGE  +\
    payload_string;

    std::string id = fc::to_string(message_id);
    std::string chain_type = "ethereum";
    std::string account = "signservice1"; //TODO: define this somewhere? is defined at compilation in dappservices?
    sign_svc_helper::svc_sign_signtrx(id, sister_address, data, chain_name, chain_type, account, 1);
}

void push_eth_receipt(
    uint64_t receipt_id, 
    std::string chain_name, 
    std::string multisig_address, 
    std::string sister_address, 
    vector<char> payload, 
    vector<char> response, 
    bool success) 
{
    string payload_string = data_to_hex_string(payload);
    string response_string = data_to_hex_string(response);

    string receipt_id_string = pad_left(n2hexstr<uint64_t>(receipt_id));
    string receipt_success_string = pad_left(n2hexstr<bool>(success));
    string response_length_string = pad_left(n2hexstr<uint64_t>(response_string.length()));

    std::string data = string(PUSH_FOREIGN_RECEIPT_METHOD_ID) +\
    BYTES_ARRAY_POINTER_PUSH_FOREIGN_RECEIPT_DATA +\
    BYTES_ARRAY_POINTER_PUSH_FOREIGN_RECEIPT_RESPONSE +\
    receipt_success_string +\
    receipt_id_string +\
    PAYLOAD_SIZE_PUSH_FOREIGN_MESSAGE  +\
    payload_string +\
    response_length_string +\
    response_string;

    std::string id = fc::to_string(receipt_id);
    std::string chain_type = "ethereum";
    std::string account = "signservice1"; //TODO: define this somewhere? is defined at compilation in dappservices?
    sign_svc_helper::svc_sign_signtrx(id, sister_address, data, chain_name, chain_type, account, 1);
}

bool handle_push_messages() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    confirmed_messages_table_t confirmed_messages(_self, _self.value);
    auto current_message = confirmed_messages.find(settings.last_pushed_messages_id + 1);
    eosio::check(current_message != confirmed_messages.end(), "{abort_service_request}");
    auto current_messages = ipfs_svc_helper::getData<vector<message_payload>>(current_message->messages_uri);
    auto curr_payload = current_messages.begin();
    while(curr_payload != current_messages.end()) {
        push_eth_message(
            current_message->id, 
            settings.sister_chain_name, 
            settings.sister_msig_address, 
            settings.sister_address, 
            curr_payload->data
        );
        curr_payload++;
    }
    settings.last_pushed_messages_id += 1;
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}

bool handle_push_receipts() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    confirmed_receipts_table_t confirmed_receipts(_self, _self.value);
    auto current_receipt = confirmed_receipts.find(settings.last_pushed_receipts_id + 1);
    eosio::check(current_receipt != confirmed_receipts.end(), "{abort_service_request}");
    auto current_receipts = ipfs_svc_helper::getData<vector<message_receipt>>(current_receipt->receipts_uri);
    auto curr_payload = current_receipts.begin();
    while(curr_payload != current_receipts.end()) {
        push_eth_receipt(
            current_receipt->id, 
            settings.sister_chain_name, 
            settings.sister_msig_address, 
            settings.sister_address, 
            curr_payload->data,
            curr_payload->response,
            curr_payload->success
        );
        curr_payload++;
    }
    settings.last_pushed_receipts_id += 1;
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}
#endif


bool handle_get_messages() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    uint64_t next_fmessages_id = settings.last_received_messages_id + 1;
    #ifdef LINK_PROTOCOL_ETHEREUM
        string messages_abi = "{\"method_name\":\"getLocalMessage\",\"input_type\":\"uint64\",\"outputs\":[{\"name\":\"data\",\"type\":\"bytes\"},{\"name\":\"block_num\",\"type\":\"uint256\"}]}";
        string uri_string =
            "eth_contract_call://"
            + settings.sister_chain_name + "/" // chain name = chain id
            + settings.sister_address + "/"
            + messages_abi + "/"
            + fc::to_string(next_fmessages_id - 1) + "/"
            + "message_payload/";
    #else
        string uri_string =
            "sister_chain_table_row://"
            + settings.sister_chain_name + "/"
            + settings.sister_address + "/"
            + "cmessages/"
            + settings.sister_address + "/"
            + fc::to_string(next_fmessages_id) + "/"
            + "messages_uri/";
    #endif
    vector<char> uri(uri_string.begin(), uri_string.end());
    vector<char> fmessages_uri = oracle_svc_helper::getURI(uri, [&]( auto& results ) {
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        return results[0].result;
    });
    #ifdef LINK_PROTOCOL_ETHEREUM
        message_payload payload = eosio::unpack<message_payload>(fmessages_uri);
        vector<message_payload> new_message{ payload };
        auto fmessages_uri_string = ipfs_svc_helper::setData(new_message);
    #else
        string fmessages_uri_string(fmessages_uri.begin(), fmessages_uri.end());
    #endif 
    compressed_fmessages_table_t fmessages_table(_self, _self.value);
    fmessages_table.emplace(_self, [&]( auto& a ){
        a.fmessages_uri = fmessages_uri_string;
        a.id = next_fmessages_id;
        a.received_block_time = eosio::current_time_point().sec_since_epoch();
    });
    settings.last_received_messages_id = next_fmessages_id;
    settings_singleton.set(settings, _self);
    return settings.processing_enabled;
}

// may need to modify uri to request lrrid+1
bool handle_get_receipts() {
    auto _self = name(current_receiver());
    settings_table settings_singleton(_self, _self.value);
    settings_t settings = settings_singleton.get_or_default();
    uint64_t next_receipts_id = settings.last_received_receipts_id + 1;
    #ifdef LINK_PROTOCOL_ETHEREUM
        string messages_abi = "{\"method_name\":\"getLocalReceipt\",\"input_type\":\"uint64\",\"outputs\":[{\"name\":\"data\",\"type\":\"bytes\"},{\"name\":\"response\",\"type\":\"bytes\"},{\"name\":\"success\",\"type\":\"bool\"},{\"name\":\"block_num\",\"type\":\"uint256\"}]}";
        string uri_string =
            "eth_contract_call://"
            + settings.sister_chain_name + "/"
            + settings.sister_address + "/"
            + messages_abi + "/"
            + fc::to_string(next_receipts_id - 1) + "/"
            + "message_receipt/";            
    #else
        string uri_string =
            "sister_chain_table_row://"
            + settings.sister_chain_name + "/"
            + settings.sister_address + "/"
            + "creceipts/"
            + settings.sister_address + "/"
            + fc::to_string(next_receipts_id) + "/"
            + "receipts_uri/";
    #endif
    vector<char> uri(uri_string.begin(), uri_string.end());
    vector<char> receipts_uri = oracle_svc_helper::getURI(uri, [&]( auto& results ) {
        check(results.size() >= LINK_PROVIDER_THRESHOLD, "total amount of DSP responses received are less than minimum threshold specified");
        return results[0].result;
    });
    #ifdef LINK_PROTOCOL_ETHEREUM        
        message_receipt receipt = eosio::unpack<message_receipt>(receipts_uri);
        vector<message_receipt> new_receipt{ receipt };
        auto receipts_uri_string = ipfs_svc_helper::setData(new_receipt);
    #else
        string receipts_uri_string(receipts_uri.begin(), receipts_uri.end());
    #endif    
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
            confirmed_messages_table_t confirmed_messages(_self, _self.value);
            confirmed_messages.emplace(_self, [&](auto& a){
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

void pushMessage(std::vector<char> data) {    
    auto _self = name(current_receiver());
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

#ifdef LINK_PROTOCOL_ETHEREUM
#define LINK_HANDLE_ETH_JOBS()\
    if (timer.to_string() == "pushreceipts") return handle_push_receipts(); \
    else if (timer.to_string() == "pushmessages") return handle_push_messages();
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
  if (processing_enabled) { \
    schedule_timer(name("cnfrmblock"), vector<char>(), 20); \
    schedule_timer(name("getmessages"), vector<char>(), 20); \
    schedule_timer(name("getreceipts"), vector<char>(), 20); \
    schedule_timer(name("hndlreceipt"), vector<char>(), 20); \
    schedule_timer(name("hndlmessage"), vector<char>(), 20); \
    schedule_timer(name("pushreceipts"), vector<char>(), 20); \
    schedule_timer(name("pushmessages"), vector<char>(), 20);\
  }\
}\
void enablelink(bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled) { \
    schedule_timer(name("cnfrmblock"), vector<char>(), 20); \
    schedule_timer(name("getmessages"), vector<char>(), 20); \
    schedule_timer(name("getreceipts"), vector<char>(), 20); \
    schedule_timer(name("hndlreceipt"), vector<char>(), 20); \
    schedule_timer(name("hndlmessage"), vector<char>(), 20); \
    schedule_timer(name("pushreceipts"), vector<char>(), 20); \
    schedule_timer(name("pushmessages"), vector<char>(), 20); \
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
  if (processing_enabled) { \
    schedule_timer(name("cnfrmblock"), vector<char>(), 20); \
    schedule_timer(name("getmessages"), vector<char>(), 20); \
    schedule_timer(name("getreceipts"), vector<char>(), 20); \
    schedule_timer(name("hndlreceipt"), vector<char>(), 20); \
    schedule_timer(name("hndlmessage"), vector<char>(), 20); \
  }\
}\
void enablelink(bool processing_enabled)\
 { \
  auto _self = name(current_receiver()); \
  settings_table settings_singleton(_self, _self.value); \
  settings_t settings = settings_singleton.get_or_default(); \
  if (processing_enabled) { \
    schedule_timer(name("cnfrmblock"), vector<char>(), 20); \
    schedule_timer(name("getmessages"), vector<char>(), 20); \
    schedule_timer(name("getreceipts"), vector<char>(), 20); \
    schedule_timer(name("hndlreceipt"), vector<char>(), 20); \
    schedule_timer(name("hndlmessage"), vector<char>(), 20); \
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
    uint64_t last_irreversible_block_time; \
    uint64_t last_pushed_messages_id; \
    uint64_t last_pushed_receipts_id; \
    uint64_t last_received_messages_id;\
    uint64_t last_received_receipts_id;\
    uint64_t last_confirmed_messages_id;\
    uint64_t last_pending_messages_id;\
    uint64_t last_confirmed_receipts_id;\
    uint64_t last_pending_receipts_id;\
};\
TABLE pending_messages_t { \
    uint64_t id; \
    std::vector<message_payload> messages; \
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
TABLE foreign_messages_t { \
    uint64_t id; \
    std::vector<message_payload> fmessages; \
    uint64_t received_block_time; \
    uint64_t last_success_block_time; \
}; \
TABLE compressed_fmessages_t { \
    uint64_t id; \
    string fmessages_uri; \
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
typedef eosio::multi_index<"fmessages"_n, compressed_fmessages_t> compressed_fmessages_table_t; \
typedef eosio::singleton<"cfmessages"_n, foreign_messages_t> current_fmessages_table_t; \
typedef eosio::multi_index<"cfmessages"_n, foreign_messages_t> current_fmessages_table_abi; \
typedef eosio::multi_index<"cmessages"_n, confirmed_messages_t> confirmed_messages_table_t; \
typedef eosio::multi_index<"pmessages"_n, pending_messages_t> pending_messages_table_t; \
typedef eosio::multi_index<"preceipts"_n, pending_receipts_t> pending_receipts_table_t;\
typedef eosio::multi_index<"creceipts"_n, compressed_messages_receipt_t> confirmed_receipts_table_t;\
LINK_INIT_METHODS()\
bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){ \
    auto _self = name(current_receiver()); \
    settings_table settings_singleton(_self, _self.value); \
    settings_t settings = settings_singleton.get_or_default(); \
    check(settings.processing_enabled, "processing disabled"); \
    LINK_HANDLE_ETH_JOBS()\
    if (timer.to_string() == "cnfrmblock") return handle_confirm_block(); \
    else if (timer.to_string() == "getmessages") return handle_get_messages(); \
    else if (timer.to_string() == "getreceipts") return handle_get_receipts(); \
    else if (timer.to_string() == "hndlreceipt") return handle_receipt(); \
    else if (timer.to_string() == "hndlmessage") return handle_message(); \
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
bool handle_message() {\
    auto _self = name(current_receiver());\
    auto current_block_time = eosio::current_time_point().sec_since_epoch();\
    current_fmessages_table_t fmessages_singleton(_self, _self.value);\
    foreign_messages_t current_fmessages = fmessages_singleton.get_or_default();\
    settings_table settings_singleton(_self, _self.value);\
    settings_t settings = settings_singleton.get_or_default();\
    vector<message_payload> pending_fmessages = current_fmessages.fmessages;\
    if (pending_fmessages.size() == 0) {\
        compressed_fmessages_table_t compressed_fmessages(_self, _self.value);\
        auto c_fmessage = compressed_fmessages.find(current_fmessages.id + 1);\
        bool retrieve_release = c_fmessage != compressed_fmessages.end();\
        eosio::check(retrieve_release, "no pending releases");\
        pending_fmessages = ipfs_svc_helper::getData<vector<message_payload>>(c_fmessage->fmessages_uri);\
        current_fmessages.id = c_fmessage->id;\
        current_fmessages.received_block_time = c_fmessage->received_block_time;\
    } else { \
        message_receipt current_receipt;\
        auto current_fmessage = pending_fmessages[0];\
        pending_fmessages.erase(pending_fmessages.begin());\
        if(current_fmessages.last_success_block_time + LINK_PROCESSING_TIMEOUT <= current_block_time) {\
            vector<char> hook_response = MESSAGE_RECEIVED_FAILURE_HOOK(current_fmessage)\
            current_receipt = {current_fmessage.data,hook_response,false};\
        } else {\
            vector<char> hook_response = MESSAGE_RECEIVED_HOOK(current_fmessage)\
            current_receipt = {current_fmessage.data,hook_response,true};\
        }\
        push_receipt(current_receipt);\
    }\
    current_fmessages.fmessages = pending_fmessages;\
    current_fmessages.last_success_block_time = current_block_time;\
    fmessages_singleton.set(current_fmessages, _self);\
    return settings.processing_enabled;\
}\
void setlinkstate (state_params new_state) {\
    auto _self = name(current_receiver()); \
    require_auth(_self);\
    settings_table settings_singleton(_self, _self.value); \
    settings_t settings = settings_singleton.get_or_default(); \
    settings.last_irreversible_block_time = new_state.last_irreversible_block_time; \
    settings.last_pushed_messages_id = new_state.last_pushed_messages_id; \
    settings.last_pushed_receipts_id = new_state.last_pushed_receipts_id; \
    settings.last_received_messages_id = new_state.last_received_messages_id; \
    settings.last_received_receipts_id = new_state.last_received_receipts_id; \
    settings.last_confirmed_messages_id = new_state.last_confirmed_messages_id; \
    settings.last_pending_messages_id = new_state.last_pending_messages_id; \
    settings.last_confirmed_receipts_id = new_state.last_confirmed_receipts_id; \
    settings.last_pending_receipts_id = new_state.last_pending_receipts_id; \
}
