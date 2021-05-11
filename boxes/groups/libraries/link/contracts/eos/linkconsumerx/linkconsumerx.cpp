#define LIQUIDX
#include "../dappservices/link.hpp"
#define CONTRACT_NAME() linkconsumerx

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) emit_released(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) emit_receipt(receipt)

#undef MESSAGE_RECEIVED_FAILURE_HOOK
#define MESSAGE_RECEIVED_FAILURE_HOOK(message) message_received_failed(message)

#undef MESSAGE_RECEIPT_FAILURE_HOOK
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) receipt_received_failed(receipt)

CONTRACT_START()

LINK_BOOTSTRAP()

struct parcel_t {
  bool success;
  uint64_t id;
  string message;
};

TABLE parcels {
  uint64_t id;
  bool remote;
  string original_message;
  string response_message;
  uint64_t primary_key()const { return id; }
};
typedef eosio::multi_index<"parcels"_n, parcels> parcels_table;

[[eosio::action]]
void init(
  name sister_code,
  string sister_chain_name,
  string this_chain_name,
  bool processing_enabled
  )
{
    require_auth(_self);
    initlink(
        sister_code,
        sister_chain_name,
        this_chain_name,
        processing_enabled
    );
    //Add additional init logic as neccessary
}

[[eosio::action]]
void enable(bool processing_enabled)
{
    require_auth(_self);
    enablelink(processing_enabled);
    //Add additional enabling logic as neccessary
}

[[eosio::action]]
void disable(bool processing_enabled)
{
    require_auth(_self);
    disablelink(processing_enabled);
}

vector<char> emit_released(const std::vector<char>& message) {
  auto current_release = eosio::unpack<parcel_t>(message);
  parcels_table parcels(_self,_self.value);
  auto this_parcel = parcels.find(current_release.id);
  check(this_parcel == parcels.end(),"that id already exists");
  parcels.emplace(_self, [&]( auto& a ){
      a.id = current_release.id;
      a.remote = true;
      a.original_message = current_release.message;
  });
  current_release.message += " pong";
  vector<char> data = eosio::pack<parcel_t>(current_release);
  return data;
} 

void emit_receipt(const std::vector<char>& receipt) {  
    auto current_release = eosio::unpack<parcel_t>(receipt);
    parcels_table parcels(_self,_self.value);
    auto this_parcel = parcels.find(current_release.id);
    check(this_parcel != parcels.end(),"that id does not exists");
    parcels.modify(this_parcel, _self, [&]( auto& a ){
        a.response_message = current_release.message;
    });
}

// handle failed message
vector<char> message_received_failed(const std::vector<char>& message) {
  auto failed_message = eosio::unpack<parcel_t>(message);
  failed_message.success = false;
  auto packed_data = eosio::pack(failed_message);
  return packed_data;
  return message;
} 

// handle failed receipt
void receipt_received_failed(message_payload receipt) { 
    auto failed_receipt = eosio::unpack<parcel_t>(receipt.data);
    failed_receipt.success = false;
    auto failed_receipt_packed = eosio::pack(failed_receipt);
    receipt.data = failed_receipt_packed;
    // add failed receipt to fmessages table
    failed_messages_table_t failed_messages(_self, _self.value);
    auto failed = failed_messages.find(receipt.id);
    if(failed == failed_messages.end()) {
        failed_messages.emplace(_self, [&](auto& a){
            a.message = receipt;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
}

[[eosio::action]]
void emit(uint64_t id, string message) {
  require_auth(_self);
  parcel_t obj = {true,id,message};
  parcels_table parcels(_self,_self.value);
  auto this_parcel = parcels.find(id);
  check(this_parcel == parcels.end(),"that id already exists");
  parcels.emplace(_self, [&]( auto& a ){
      a.id = id;
      a.remote = false;
      a.original_message = message;
  });
  auto data = eosio::pack<parcel_t>(obj);
  pushMessage(data);
}

CONTRACT_END((init)(enable)(emit)(disable))
