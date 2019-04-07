#include "../dappservices/multi_index.hpp"
#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS() 
#define CONTRACT_NAME() registry
using std::string;
CONTRACT_START()
      
    TABLE item {
     name               item_name;
     std::vector<char>  content;
     bool               is_alias; 
     name               schema_scope;
     name               schema_name; 
     uint64_t primary_key()const { return item_name.value; }
    };
      
    typedef dapp::multi_index<"vitems"_n, item> cold_items_t;
    typedef eosio::multi_index<".vitems"_n, item> cold_items_t_v_abi;
    TABLE shardbucket {
        std::vector<char> shard_uri;
        uint64_t shard;
        uint64_t primary_key() const { return shard; }
    };
    typedef eosio::multi_index<"vitems"_n, shardbucket> cold_items_t_abi;
      
      
    [[eosio::action]] void regitem(name owner, item new_item){
        require_auth( owner );
        
        cold_items_t items( _self, owner.value );
        auto existing = items.find( new_item.item_name.value );
        if(existing == items.end()) {
            items.emplace(_self, [&]( auto& a ){
                 a.item_name = new_item.item_name;
                 a.content = new_item.content;
                 a.is_alias = new_item.is_alias;
                 a.schema_scope = new_item.schema_scope;
                 a.schema_name = new_item.schema_name;
            });
        } else {
            items.modify( *existing, eosio::same_payer, [&]( auto& a ) {
                 a.item_name = new_item.item_name;
                 a.content = new_item.content;
                 a.is_alias = new_item.is_alias;
                 a.schema_scope = new_item.schema_scope;
                 a.schema_name = new_item.schema_name;
            });
       }
    }
    
    [[eosio::action]] void warmupitem(name owner, item new_item){
        cold_items_t items( _self, owner.value );
        auto existing = items.find( new_item.item_name.value );
    }
CONTRACT_END((regitem)(warmupitem))