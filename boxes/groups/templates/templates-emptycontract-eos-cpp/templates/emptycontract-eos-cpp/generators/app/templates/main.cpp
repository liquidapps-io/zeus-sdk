#include "../dappservices/multi_index.hpp"
#include "../dappservices/log.hpp"
#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/vaccounts.hpp"
#include "../dappservices/readfn.hpp"
#include "../dappservices/vcpu.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS \
  VACCOUNTS_DAPPSERVICE_ACTIONS \
  LOG_DAPPSERVICE_ACTIONS \
  CRON_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS \
  VCPU_DAPPSERVICE_ACTIONS \
  READFN_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()VACCOUNTS_SVC_COMMANDS()LOG_SVC_COMMANDS()READFN_SVC_COMMANDS()VCPU_SVC_COMMANDS()
#define CONTRACT_NAME() <%- contractname %>
using std::string;
CONTRACT_START()


      TABLE stat {
          uint64_t   counter = 0;
      };

      typedef eosio::singleton<"stat"_n, stat> stats_def;
      bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){

        stats_def statstable(_self, _self.value);
        stat newstats;
        if(!statstable.exists()){
          statstable.set(newstats, _self);
        }
        else{
          newstats = statstable.get();
        }
        auto reschedule = false;
        if(newstats.counter++ < 3){
          reschedule = true;
        }
        statstable.set(newstats, _self);
        return reschedule;
        // reschedule

      }
     [[eosio::action]] void testschedule() {
        std::vector<char> payload;
        schedule_timer(_self, payload, 2);
      }


      struct dummy_action_hello {
          name vaccount;
          uint64_t b;
          uint64_t c;

          EOSLIB_SERIALIZE( dummy_action_hello, (vaccount)(b)(c) )
      };

      [[eosio::action]] void hello(dummy_action_hello payload) {
        require_vaccount(payload.vaccount);

        print("hello from ");
        print(payload.vaccount);
        print(" ");
        print(payload.b + payload.c);
        print("\n");
      }

      [[eosio::action]] void hello2(dummy_action_hello payload) {
        print("hello2(default action) from ");
        print(payload.vaccount);
        print(" ");
        print(payload.b + payload.c);
        print("\n");
      }



      TABLE account {
         extended_asset balance;
         uint64_t primary_key()const { return balance.contract.value; }
      };

      typedef dapp::multi_index<"vaccounts"_n, account> cold_accounts_t;
      typedef eosio::multi_index<".vaccounts"_n, account> cold_accounts_t_v_abi;
      TABLE shardbucket {
          std::vector<char> shard_uri;
          uint64_t shard;
          uint64_t primary_key() const { return shard; }
      };
      typedef eosio::multi_index<"vaccounts"_n, shardbucket> cold_accounts_t_abi;


     [[eosio::action]] void withdraw( name to, name token_contract){

            require_auth( to );
            require_recipient( to );
            auto received = sub_all_cold_balance(to, token_contract);
            action(permission_level{_self, "active"_n}, token_contract, "transfer"_n,
               std::make_tuple(_self, to, received, std::string("withdraw")))
            .send();
      }

     void transfer( name from,
                     name to,
                     asset        quantity,
                     string       memo ){
        require_auth(from);
        if(to != _self || from == _self || from == "eosio"_n || from == "eosio.stake"_n || from == to)
            return;
        if(memo == "seed transfer")
            return;
        if (memo.size() > 0){
          name to_act = name(memo.c_str());
          eosio::check(is_account(to_act), "The account name supplied is not valid");
          require_recipient(to_act);
          from = to_act;
        }
        extended_asset received(quantity, get_first_receiver());
        add_cold_balance(from, received);
     }

   private:
      extended_asset sub_all_cold_balance( name owner, name token_contract){
           cold_accounts_t from_acnts( _self, owner.value );
           const auto& from = from_acnts.get( token_contract.value, "no balance object found" );
           auto res = from.balance;
           from_acnts.erase( from );
           return res;
      }

      void add_cold_balance( name owner, extended_asset value){
           cold_accounts_t to_acnts( _self, owner.value );
           auto to = to_acnts.find( value.contract.value );
           if( to == to_acnts.end() ) {
              to_acnts.emplace(_self, [&]( auto& a ){
                a.balance = value;
              });
           } else {
              to_acnts.modify( *to, eosio::same_payer, [&]( auto& a ) {
                a.balance += value;
              });
           }
      }

    VACCOUNTS_APPLY(((dummy_action_hello)(hello))((dummy_action_hello)(hello2)))

CONTRACT_END((withdraw)(hello)(hello2)(regaccount)(testschedule)(xvinit))