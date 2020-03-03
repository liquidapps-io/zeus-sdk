#include <eosio/eosio.hpp>
#include <eosio/multi_index.hpp>
using namespace eosio;
using namespace std;
using namespace internal_use_do_not_use;
CONTRACT allservices : public eosio::contract {
public:  
  using contract::contract;
  [[eosio::action]] void freeprovider(name provider) {
    auto it = db_lowerbound_i64(_self.value, provider.value, name("providermdl").value, 0);
    while (it >= 0) {
        auto del = it;
        uint64_t dummy;
        it = db_next_i64(it, &dummy);
        db_remove_i64(del);
    }
  }
};