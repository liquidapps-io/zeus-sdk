#pragma once

#include <eosiolib/eosio.hpp>
#include <eosiolib/transaction.hpp>
#include <map>
#include <vector>
using namespace eosio;
using namespace std;
typedef string entity_name;
typedef uint64_t entity_key;
typedef string description_t;

typedef uint64_t package_key;
typedef string package_name;

typedef string location_name;
typedef uint64_t location_key;
typedef string item_name;
typedef uint64_t item_key;
typedef string recipe_name;
typedef uint64_t recipe_key;
#include <math.h>
#include <eosiolib/types.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/symbol.hpp>
#include <eosiolib/currency.hpp>
#include <eosio.system/eosio.system.hpp>



using namespace eosiosystem;


typedef string resource_url;
      //@abi table
      struct package {
         package_key       pkey;
         account_name   owner;
         package_name    name;
         description_t  description;
         resource_url   icon;
         vector<package_key> req_packages;
         uint64_t primary_key() const { return pkey; }
         EOSLIB_SERIALIZE( package, (pkey)(owner)(name)(description)(icon)(req_packages) )
      };
      struct itemncount{
         item_key       item;
         int64_t       count;
         EOSLIB_SERIALIZE( itemncount, (item)(count) )
      };
      
      //@abi table
       struct game {
         account_name   owner;
         vector<package_key> default_packages;
         vector<itemncount>  default_inventory;
         resource_url  map_image;
         resource_url  map_music;
         uint64_t primary_key() const { return owner; }
         EOSLIB_SERIALIZE( game, (owner)(default_packages)(default_inventory)(map_image)(map_music) )
      };
      
      //@abi table
      struct item{
         item_key       pkey;
         account_name   owner;
         item_name      name;
         description_t  description;
         package_key    package;
         uint32_t       hidden;
         resource_url   sfx;
         resource_url   icon;
         uint64_t primary_key() const { return pkey; }
         EOSLIB_SERIALIZE( item, (pkey)(owner)(name)(description)(package)(hidden)(sfx)(icon) )
      };
      
      
      struct pos{
         uint32_t       x;
         uint32_t       y;
         EOSLIB_SERIALIZE( pos, (x)(y) )
      };
      
      //@abi table
      struct location{
         location_key       pkey;
         account_name   owner;
         location_name      name;
         description_t    description;
         package_key    package;
         resource_url   music;
         resource_url   marker_icon;
         resource_url   background;
         pos            position;
         vector<item_key>      reqs;
         uint64_t primary_key() const { return pkey; }
         EOSLIB_SERIALIZE( location, (pkey)(owner)(name)(description)(package)(music)(marker_icon)(background)(position)(reqs) )
      };
      
      //@abi table
      struct recipe
      {
         recipe_key      pkey;
         account_name  owner;
         recipe_name   name;
         description_t    description;
         package_key    package;
         vector<itemncount>   outputs;
         vector<itemncount>    ingreds;
         vector<item_key>     tools;
         vector<location_key>  locations;
         string       act_label;
         string       act_label_ing;
         resource_url   sfx;
         resource_url   icon;          
         uint32_t cooldown;
         uint64_t primary_key() const { return pkey; }
         EOSLIB_SERIALIZE( recipe, (pkey)(owner)(name)(description)(package)(outputs)(ingreds)(tools)(locations)(act_label)(act_label_ing)(sfx)(icon)(cooldown) )
      };
      
      //@abi table
      struct gameaccount
      {
         account_name  owner;
         vector<package_key>   active_packages;
         vector<itemncount>    cooldowns;
         vector<itemncount> items;
         uint64_t primary_key() const { return owner; }
         EOSLIB_SERIALIZE( gameaccount, (owner)(active_packages)(cooldowns)(items) )
      };

      //@abi table
      struct connector
      {
         account_name  owner;
         itemncount    supply;
         uint64_t      coins;
         uint32_t      base_weight;
         uint32_t      target_weight;
         uint64_t primary_key() const { return supply.item; }
         EOSLIB_SERIALIZE( connector, (owner)(supply)(coins)(base_weight)(target_weight) )
      };
      
class craft : public eosio::contract {

   public:
      typedef eosio::multi_index<N(recipe), recipe> recipes;
      typedef eosio::multi_index<N(item), item> items;
      typedef eosio::multi_index<N(location), location> locations;
      typedef eosio::multi_index<N(package), package> packages;
      typedef eosio::multi_index<N(gameaccount), gameaccount> game_accounts;
      typedef eosio::multi_index<N(game), game> games;
      typedef eosio::multi_index<N(connector), connector> connectors;
      

      craft( account_name self )
      :contract(self),
      games_table( _self, _self ),
      game_accounts_table( _self, _self ),
      items_table( _self, _self ),
      recipes_table( _self, _self ),
      locations_table( _self, _self ),
      packages_table( _self, _self ),
      connectors_table(_self, _self)
      {
          
      }
      
      void gameact (account_name owner, recipe_key the_recipe);
      
      void transfer (account_name from, account_name to, itemncount items);
      
      void incpackage (account_name owner, package_key package);
      
      // mgt
      void newpackage (account_name owner,package_name name,description_t description,resource_url icon, bool is_default);
      void newitem (account_name owner,item_name name,description_t description, package_key package,  uint32_t hidden, resource_url sfx, resource_url icon, bool is_default);
      void newlocation (account_name owner,location_name name, description_t description, package_key package, resource_url music, resource_url marker_icon, resource_url background,pos position, vector<item_key> reqs);
      void newrecipe (
            account_name owner,
            recipe_name name, 
            description_t description, 
            package_key package,
            vector<itemncount> outputs,
            vector<itemncount> ingreds,
            vector<item_key> tools,
            vector<location_key> locations,
            string act_label,
            string act_label_ing,
            resource_url sfx, 
            resource_url icon,
            uint32_t cooldown);
      
      void init(resource_url map_image,resource_url map_music){
         require_auth(_self);
         auto res = games_table.emplace( _self, [&]( auto& s ) {
          s.owner = _self;
          s.default_packages = {}; 
          s.default_inventory = {};
          s.map_image = map_image;
          s.map_music = map_music;
         });
      }
      void start (account_name owner){
        require_auth( owner );
        getCreateGameAccount(owner);
      }
      
      
      
      real_type convert_to_exchange(real_type balance, real_type in, real_type supply, int64_t weight , bool sell) {
        real_type R(supply);
        real_type C(balance+ (in * (sell ? -1 : 1)));
        real_type F(weight/1000.0);
        real_type T(in);
        real_type ONE(1.0);
      
        real_type E = -R * (ONE - pow( ONE + T / C, F) );
        return E;
      
      }
      
      real_type convert_from_exchange( real_type balance, real_type in, real_type supply, int64_t weight , bool sell) {
        real_type R(supply - (in * (sell ? -1 : 1)));
        real_type C(balance);
        real_type F(1000.0/weight);
        real_type E(in);
        real_type ONE(1.0);
      
        real_type T = C * (pow( ONE + E/R, F) - ONE);
        return T;
      }

      real_type calcPrice(itemncount items, bool sell){
         auto existing = connectors_table.find( items.item );
         eosio_assert( existing != connectors_table.end(), "connector doesn't exist" );
         auto currentSmartSupply = 10000000;
         auto smartTokens = convert_to_exchange(existing->supply.count, items.count, currentSmartSupply, existing->base_weight , sell);
         auto targetTokens = convert_from_exchange(existing->coins, smartTokens, currentSmartSupply, existing->target_weight , sell);
         auto price = targetTokens;
         return price;
      }
      
      void buy(account_name owner, itemncount items){
          require_auth(owner);
          eosio_assert(items.count,"must be positive");
          int64_t price = calcPrice(items, false);
          add_to_inventory(owner, 0,-price, owner);
          add_to_inventory(owner, items.item,items.count , owner);
          modifyConnectorBalances(items.item, price, -items.count);
      }
      void sell(account_name owner, itemncount items){
          require_auth(owner);
          eosio_assert(items.count,"must be positive");
          int64_t price = calcPrice(items, true);
          add_to_inventory(owner, items.item,-items.count, owner);
          add_to_inventory(owner, 0, price, owner);
          modifyConnectorBalances(items.item, -price, items.count);
      }

      void modifyConnectorBalances(item_key item, uint64_t coins, uint64_t amount){
         auto existing = connectors_table.find( item );
         eosio_assert( existing != connectors_table.end(), "connector doesn't exist" );
         connectors_table.modify( *existing, existing->owner, [&]( auto& s ) {
            eosio_assert( s.coins + coins >= 0 , "not enough coins" );
            eosio_assert( s.supply.count + amount >= 0, "not enough items" );
            s.supply.count += amount;
            s.coins += coins;
         });
      }


      void addcnct (account_name owner, itemncount supply, uint64_t coins, uint32_t base_weight, uint32_t target_weight){
         require_auth(owner);
         auto item = getItem(supply.item);
         auto package = getPackage(item.package);
         require_auth(package.owner);
         if(package.owner != _self){
            // transfer money from account to sponser market relay
            add_to_inventory(owner, 0, -coins, owner);
         }
         
          auto existing = connectors_table.find( supply.item );
          eosio_assert( existing == connectors_table.end(), "already exists" );
           connectors_table.emplace( owner, [&]( auto& s ) {
             s.owner = owner;
             s.supply = supply;
             s.coins = coins;
             s.base_weight = base_weight;
             s.target_weight = target_weight;
          });
      }
      
      void resetall(){
        require_auth(_self);
        // if(cleanTable<game_accounts>()) return;
        if(cleanTable<games>()) return;
        if(cleanTable<packages>()) return;
        if(cleanTable<locations>()) return;
        if(cleanTable<connectors>()) return;
        if(cleanTable<recipes>()) return;
        if(cleanTable<items>()) return;
      }


   private:
      games games_table;
      game_accounts game_accounts_table;
      items items_table;
      recipes recipes_table;
      locations locations_table;
      packages packages_table;
      connectors connectors_table;
      
      bool verify_invetory_count(account_name owner, item_key item, int64_t count){
        auto account = getCreateGameAccount(owner);
        for(auto itemc: account.items){
            if(itemc.item == item){
                return (itemc.count >= count);
            }
        }
        return false;

      }
      void add_to_inventory(account_name owner, item_key item, int64_t count,account_name payer){
        auto existing = game_accounts_table.find( owner );
        game_accounts_table.modify( existing, owner, [&]( auto& account ) {
            auto found = false;
            std::vector<itemncount> newItems;
            for(auto itemc: account.items){
                if(itemc.item == item){
                    found = true;
                    auto newCount = itemc.count + count;
                    eosio_assert(newCount >= 0 , "not enough of item (existing)" );
                    itemc.count = newCount;
                }
                newItems.push_back(itemc);
            }
            account.items = newItems;
            
            if(!found){
                eosio_assert(count >= 0 , "not enough of item" );
                itemncount newitemcnt;
                newitemcnt.item = item;
                newitemcnt.count = count;
                account.items.push_back(newitemcnt);
            }
        });
      }
      
      game getGame(){
          auto existing = games_table.find( _self );
          eosio_assert( existing != games_table.end(), "not found" );
          return *existing;
      }
      
      recipe getRecipe(recipe_key key){
          auto existing = recipes_table.find( key );
          eosio_assert( existing != recipes_table.end(), "not found" );
          return *existing;
      }
      
      item getItem(item_key key){
          auto existing = items_table.find( key );
          eosio_assert( existing != items_table.end(), "not found" );
          return *existing;
      }
      location getLocation(location_key key){
          auto existing = locations_table.find( key );
          eosio_assert( existing != locations_table.end(), "not found" );
          return *existing;
      }
      package getPackage(package_key key){
          auto existing = packages_table.find( key );
          eosio_assert( existing != packages_table.end(), "not found" );
          return *existing;
      }
      
      gameaccount getCreateGameAccount(account_name owner){
          auto existing = game_accounts_table.find( owner );
          if(existing != game_accounts_table.end()){
            return *existing;
          }
          auto game = getGame();
          gameaccount* account;
           game_accounts_table.emplace( owner, [&]( auto& s ) {
             s.owner = owner;
             s.active_packages = game.default_packages;
             s.cooldowns = {};
             s.items = game.default_inventory;
             account = &s;
          });
          return *account;
      }
      template <typename T>
        bool cleanTable(){
            T db(_self, _self);
            int64_t i = 0;
            while(db.begin() != db.end()){
                auto itr = --db.end();
                db.erase(itr);
                if(i++ == 5)
                    return true;
            }
            return false;
        }
  
      
      void craft(account_name owner, recipe recipeData);

      bool validateLocationNeeds(account_name owner, location_key aLocation);
   
};
