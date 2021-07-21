#include <eosio/eosio.hpp>

using namespace eosio;
using namespace std;

CONTRACT sareject : public contract{
	public:
		using contract::contract;

        ACTION init() {
            check(false, "init does not work");
        }
        
        [[eosio::on_notify("simpleassets::offer")]]
        void on_offer( name owner, name newowner, vector< uint64_t >& assetids, string memo ) {
            check(false, "does not accept offers");
        }
};