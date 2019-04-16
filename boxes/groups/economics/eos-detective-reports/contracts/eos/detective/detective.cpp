#include <eosio/eosio.hpp>
#include <eosio/time.hpp>
#include <eosio/system.hpp>
#include <string>

using std::string;
using namespace eosio;

class [[eosio::contract("detective")]] detective : public contract {
    public:
        detective(name receiver, name code, datastream<const char*> ds)
        :contract(receiver, code, ds),
        _accounts(_self, _self.value)
        {}

        [[eosio::action]]
        void post(name account, uint8_t score, const string& metadata) {
          require_auth( _self );
          auto row = _accounts.find( account.value );
          if(metadata == "") {
            eosio::check(row != _accounts.end(), "account does not exist" );
            _accounts.erase(row);
          } else {
            if( row == _accounts.end() ) {
                _accounts.emplace( _self, [&]( auto& a ){
                  a.account = account;
                  a.score = score;
                  a.metadata = metadata;
                  a.timestamp = time_point_sec(eosio::current_time_point().sec_since_epoch());
                });
             } else {
                _accounts.modify( row, _self, [&]( auto& a ) {
                  a.score = score;
                  a.metadata = metadata;
                  a.timestamp = time_point_sec(eosio::current_time_point().sec_since_epoch());
                });
             }
          }
        }

        [[eosio::action]]
        void expire(name account) {
          require_auth( _self );
          auto row = _accounts.find( account.value );
          eosio::check(row != _accounts.end() && row->is_expired(), "account must exist and be expired");
          _accounts.erase(row);
        }

    private:
        constexpr static uint32_t EXPIRE_PERIOD_IN_SECONDS = 30 * 24 * 60 * 60;

        struct [[eosio::table]] account_row {
           name         account;    //account name
           uint8_t      score;      //enables a score between 0 to 255
           string       metadata;   //json meta data
           time_point_sec   timestamp;

           uint64_t primary_key()const { return account.value; }
           uint64_t by_timestamp() const { return uint64_t(timestamp.sec_since_epoch()); }

           bool is_expired() const { return time_point_sec(eosio::current_time_point().sec_since_epoch()) > (timestamp + EXPIRE_PERIOD_IN_SECONDS); }
        };

        typedef eosio::multi_index<
          name("accounts"), account_row,
          indexed_by<name("bytime"), const_mem_fun<account_row, uint64_t, &account_row::by_timestamp>>
        > accounts_table;

        accounts_table _accounts;
};

EOSIO_DISPATCH(detective, (post)(expire))