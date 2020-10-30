#include "../dappservices/link.hpp"
#define CONTRACT_NAME() linkconsumer

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) emit_released(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) emit_receipt(receipt)

CONTRACT_START()

LINK_BOOTSTRAP()

struct parcel_t {
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
    enablelink(processing_enabled);
    //Add additional enabling logic as neccessary
}

vector<char> emit_released(vector<char> message) {
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

void emit_receipt(vector<char> receipt) {  
    auto current_release = eosio::unpack<parcel_t>(receipt);
    parcels_table parcels(_self,_self.value);
    auto this_parcel = parcels.find(current_release.id);
    check(this_parcel != parcels.end(),"that id does not exists");
    parcels.modify(this_parcel, _self, [&]( auto& a ){
        a.response_message = current_release.message;
    });
}

[[eosio::action]]
void emit(uint64_t id, string message) {
  parcel_t obj = {id,message};
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

CONTRACT_END((init)(enable)(emit))
