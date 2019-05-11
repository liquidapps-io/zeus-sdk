#include <map>
#include <vector>
#include <math.h>
#include <eosio/eosio.hpp>

#include <eosio/asset.hpp>
#include <eosio/symbol.hpp>
#include <eosio/transaction.hpp>
#include "../dappservices/multi_index.hpp"
#include "../dappservices/log.hpp"
#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/vaccounts.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS \
  VACCOUNTS_DAPPSERVICE_ACTIONS \
  LOG_DAPPSERVICE_ACTIONS \
  CRON_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()VACCOUNTS_SVC_COMMANDS()LOG_SVC_COMMANDS()


#define CONTRACT_NAME() craftcore 


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


typedef string resource_url;

      
CONTRACT_START()
      void timer_callback(name timer, std::vector<char> payload, uint32_t seconds){
      }
      
      void execute_vaccounts_action(action act){
      }
      struct [[eosio::table]] package {
         package_key       pkey;
         name   owner;
         package_name    name;
         description_t  description;
         resource_url   icon;
         vector<package_key> req_packages;
         uint64_t primary_key() const { return pkey; }
      };
      struct itemncount{
         item_key       item;
         int64_t       count;
      };
      
       struct [[eosio::table]]  game {
         name   owner;
         vector<package_key> default_packages;
         vector<itemncount>  default_inventory;
         resource_url  map_image;
         resource_url  map_music;
         uint64_t primary_key() const { return owner.value; }
      };
      
      struct [[eosio::table]]  item{
         item_key       pkey;
         name   owner;
         item_name      name;
         description_t  description;
         package_key    package;
         uint32_t       hidden;
         resource_url   sfx;
         resource_url   icon;
         uint64_t primary_key() const { return pkey; }
      };
      
      
      struct pos{
         uint32_t       x;
         uint32_t       y;
      };
      
      struct [[eosio::table]] location{
         location_key       pkey;
         name   owner;
         location_name      name;
         description_t    description;
         package_key    package;
         resource_url   music;
         resource_url   marker_icon;
         resource_url   background;
         pos            position;
         vector<item_key>      reqs;
         uint64_t primary_key() const { return pkey; }
      };
      
      struct [[eosio::table]] recipe
      {
         recipe_key      pkey;
         name  owner;
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
      };
      
      struct [[eosio::table]] gameaccount
      {
         name  owner;
         vector<package_key>   active_packages;
         vector<itemncount>    cooldowns;
         vector<itemncount> items;
         uint64_t primary_key() const { return owner.value; }
      };

      struct [[eosio::table]] connector
      {
         name  owner;
         itemncount    supply;
         uint64_t      coins;
         uint32_t      base_weight;
         uint32_t      target_weight;
         uint64_t primary_key() const { return supply.item; }
      };
      typedef eosio::multi_index<"recipe"_n, recipe> recipes;
      typedef eosio::multi_index<"item"_n, item> items;
      typedef eosio::multi_index<"location"_n, location> locations;
      typedef eosio::multi_index<"package"_n, package> packages;
      typedef eosio::multi_index<"gameaccount"_n, gameaccount> game_accounts;
      typedef eosio::multi_index<"game"_n, game> games;
      typedef eosio::multi_index<"connector"_n, connector> connectors;
      

      craftcore( name self, name first_receiver, datastream<const char*> ds)
      :contract(self, first_receiver, ds),
      games_table( _self, _self.value),
      game_accounts_table( _self, _self.value),
      items_table( _self, _self.value),
      recipes_table( _self, _self.value),
      locations_table( _self, _self.value),
      packages_table( _self, _self.value),
      connectors_table(_self, _self.value)
      {
          
      }
      
      [[eosio::action]] void gameact (name owner, recipe_key the_recipe)
      {
          require_auth( owner );
          auto account = getCreateGameAccount(owner);
          craft(owner, getRecipe(the_recipe) );
      };
      
      [[eosio::action]] void transfer (name from, name to, itemncount items){
        require_auth(from);
        check(items.count > 0,"must be positive");
        require_recipient(to);
        add_to_inventory(from, items.item,-items.count, from);
        add_to_inventory(to, items.item,items.count, from);
      }
      
      [[eosio::action]] void incpackage (name owner, package_key package)
      {
        require_auth( owner );
        auto account = getCreateGameAccount(owner);
        std::vector<package_key> arr = account.active_packages;
        arr.push_back(package);
        game_accounts_table.modify( game_accounts_table.get(owner.value), owner, [&]( auto& account) {
            account.active_packages = arr;
        });
      };
      
      // mgt
      [[eosio::action]] void newpackage (name owner,package_name name,description_t description,resource_url icon, bool is_default)
      {
        require_auth( owner );
        auto newKey = packages_table.available_primary_key();
        packages_table.emplace( owner, [&]( auto& s ) {
          s.pkey = newKey;
          s.description = description;
          s.name = name;
          s.owner = owner;
          s.icon = icon;
        });
        if(is_default){
            require_auth( _self );
            games_table.modify( (games_table.get(_self.value)), _self , [&]( auto& s) {
                s.default_packages.push_back(newKey);
            });
        }
    };
      [[eosio::action]] void newitem (name owner,item_name name,description_t description, package_key package,  uint32_t hidden, resource_url sfx, resource_url icon, bool is_default)
      {
        require_auth( owner );
        auto cpackage = getPackage(package);
        require_auth( cpackage.owner );
        
        auto newKey = items_table.available_primary_key();
        items_table.emplace( owner, [&]( auto& s ) {
          s.pkey = newKey;
          s.owner = owner;
          s.name = name;
          s.package = package;
          s.description = description;
          s.sfx = sfx;
          s.icon = icon;
          s.hidden = hidden;
        });
        if(is_default){
            require_auth( _self );
            games_table.modify( (games_table.get(_self.value)), _self , [&]( auto& s) {
                itemncount x;
                x.count = 1;
                x.item = newKey;
                s.default_inventory.push_back(x);
            });
        }
    
        
    };
      [[eosio::action]] void newlocation (name owner,location_name name, description_t description, package_key package, resource_url music, resource_url marker_icon, resource_url background,pos position, vector<item_key> reqs){
            require_auth( owner );
            auto cpackage = getPackage(package);
            require_auth( cpackage.owner );
            
            auto newKey = locations_table.available_primary_key();
            locations_table.emplace( owner, [&]( auto& s ) {
              s.pkey = newKey;
              s.owner = owner;
              s.name = name;
              s.package = package;
              s.description = description;
              
              s.music = music;
              s.background = background;
              s.position = position;
              s.reqs = reqs;
              s.marker_icon = marker_icon;
            });
          
        };
      [[eosio::action]] void newrecipe (
            name owner,
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
            uint32_t cooldown)
            {
                require_auth( owner );
                auto cpackage = getPackage(package);
                require_auth( cpackage.owner );
                
                auto newKey = recipes_table.available_primary_key();
                recipes_table.emplace( owner, [&]( auto& s ) {
                  s.pkey = newKey;
                  s.owner = owner;
                  s.name = name;
                  s.package = package;
                  s.description = description;
                  
                  s.sfx = sfx;
                  s.icon = icon;
                  s.outputs = outputs;
                  s.ingreds = ingreds;
                  s.tools = tools;
                  s.locations = locations;
                  s.act_label = act_label;
                  s.act_label_ing = act_label_ing;
                  s.cooldown = cooldown;
                });
            }
      
      [[eosio::action]] void init(resource_url map_image,resource_url map_music){
         require_auth(_self);
         auto res = games_table.emplace( _self, [&]( auto& s ) {
          s.owner = _self;
          s.default_packages = {}; 
          s.default_inventory = {};
          s.map_image = map_image;
          s.map_music = map_music;
         });
      }
      [[eosio::action]] void start (name owner){
        require_auth( owner );
        getCreateGameAccount(owner);
      }
      
      
      
      double convert_to_exchange(double balance, double in, double supply, int64_t weight , bool sell) {
        double R(supply);
        double C(balance+ (in * (sell ? -1 : 1)));
        double F(weight/1000.0);
        double T(in);
        double ONE(1.0);
      
        double E = -R * (ONE - pow( ONE + T / C, F) );
        return E;
      
      }
      
      double convert_from_exchange( double balance, double in, double supply, int64_t weight , bool sell) {
        double R(supply - (in * (sell ? -1 : 1)));
        double C(balance);
        double F(1000.0/weight);
        double E(in);
        double ONE(1.0);
      
        double T = C * (pow( ONE + E/R, F) - ONE);
        return T;
      }

      double calcPrice(itemncount items, bool sell){
         auto existing = connectors_table.find( items.item );
         check( existing != connectors_table.end(), "connector doesn't exist" );
         auto currentSmartSupply = 10000000;
         auto smartTokens = convert_to_exchange(existing->supply.count, items.count, currentSmartSupply, existing->base_weight , sell);
         auto targetTokens = convert_from_exchange(existing->coins, smartTokens, currentSmartSupply, existing->target_weight , sell);
         auto price = targetTokens;
         return price;
      }
      
      void buy(name owner, itemncount items){
          require_auth(owner);
          check(items.count,"must be positive");
          int64_t price = calcPrice(items, false);
          add_to_inventory(owner, 0,-price, owner);
          add_to_inventory(owner, items.item,items.count , owner);
          modifyConnectorBalances(items.item, price, -items.count);
      }
      void sell(name owner, itemncount items){
          require_auth(owner);
          check(items.count,"must be positive");
          int64_t price = calcPrice(items, true);
          add_to_inventory(owner, items.item,-items.count, owner);
          add_to_inventory(owner, 0, price, owner);
          modifyConnectorBalances(items.item, -price, items.count);
      }

      void modifyConnectorBalances(item_key item, uint64_t coins, uint64_t amount){
         auto existing = connectors_table.find( item );
         check( existing != connectors_table.end(), "connector doesn't exist" );
         connectors_table.modify( *existing, existing->owner, [&]( auto& s ) {
            check( s.coins + coins >= 0 , "not enough coins" );
            check( s.supply.count + amount >= 0, "not enough items" );
            s.supply.count += amount;
            s.coins += coins;
         });
      }


      void addcnct (name owner, itemncount supply, uint64_t coins, uint32_t base_weight, uint32_t target_weight){
         require_auth(owner);
         auto item = getItem(supply.item);
         auto package = getPackage(item.package);
         require_auth(package.owner);
         if(package.owner != _self){
            // transfer money from account to sponser market relay
            add_to_inventory(owner, 0, -coins, owner);
         }
         
          auto existing = connectors_table.find( supply.item );
          check( existing == connectors_table.end(), "already exists" );
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
      
      bool verify_invetory_count(name owner, item_key item, int64_t count){
        auto account = getCreateGameAccount(owner);
        for(auto itemc: account.items){
            if(itemc.item == item){
                return (itemc.count >= count);
            }
        }
        return false;

      }
      void add_to_inventory(name owner, item_key item, int64_t count,name payer){
        auto existing = game_accounts_table.find( owner.value );
        game_accounts_table.modify( existing, owner, [&]( auto& account ) {
            auto found = false;
            std::vector<itemncount> newItems;
            for(auto itemc: account.items){
                if(itemc.item == item){
                    found = true;
                    auto newCount = itemc.count + count;
                    check(newCount >= 0 , "not enough of item (existing)" );
                    itemc.count = newCount;
                }
                newItems.push_back(itemc);
            }
            account.items = newItems;
            
            if(!found){
                check(count >= 0 , "not enough of item" );
                itemncount newitemcnt;
                newitemcnt.item = item;
                newitemcnt.count = count;
                account.items.push_back(newitemcnt);
            }
        });
      }
      
      game getGame(){
          auto existing = games_table.find( _self.value );
          check( existing != games_table.end(), "not found" );
          return *existing;
      }
      
      recipe getRecipe(recipe_key key){
          auto existing = recipes_table.find( key );
          check( existing != recipes_table.end(), "not found" );
          return *existing;
      }
      
      item getItem(item_key key){
          auto existing = items_table.find( key );
          check( existing != items_table.end(), "not found" );
          return *existing;
      }
      location getLocation(location_key key){
          auto existing = locations_table.find( key );
          check( existing != locations_table.end(), "not found" );
          return *existing;
      }
      package getPackage(package_key key){
          auto existing = packages_table.find( key );
          check( existing != packages_table.end(), "not found" );
          return *existing;
      }
      
      gameaccount getCreateGameAccount(name owner){
          auto existing = game_accounts_table.find( owner.value );
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
            T db(_self, _self.value);
            int64_t i = 0;
            while(db.begin() != db.end()){
                auto itr = --db.end();
                db.erase(itr);
                if(i++ == 5)
                    return true;
            }
            return false;
        }
  
      
      void craft(name owner, recipe recipeData){
            
            // check location 
            bool validLocation = false;
            for (auto aLocation : recipeData.locations){
                if(validateLocationNeeds(owner, aLocation)){
                    validLocation = true;
                    break;
                }
            }
            check(validLocation, "no valid locations to craft this");
            
            auto account = getCreateGameAccount(owner);
            auto cooldowns = getLatestCooldowns(account.cooldowns, 0);
            
            // TODO: check cooldown
            for (auto tool : recipeData.tools) {
                bool res = verify_invetory_count(owner, tool, 1);
                check(res , "not enough of item" );
            }
            for (auto ingred : recipeData.ingreds) {
                auto item = ingred.item;
                auto count = ingred.count;
                add_to_inventory(owner,item,-count, owner);
            }
            for (auto outpair : recipeData.outputs) {
                auto item = outpair.item;
                auto count = outpair.count;
                add_to_inventory(owner,item,count, owner);
            }
            
            
            if(recipeData.cooldown > 0){
                // TODO: update cooldown for recipe    
            }
            game_accounts_table.modify( game_accounts_table.get(owner.value), owner, [&]( auto& account) {
                account.cooldowns = cooldowns;
                
            });
      }


      bool validateLocationNeeds(name owner, location_key aLocation){
        auto loc = getLocation(aLocation);
        if(loc.reqs.size() == 0)
            return true;
        for(auto i : loc.reqs){
            bool res = verify_invetory_count(owner, i, 1);
            if(res)
                return true;
        }
        return false;
    }

    private:
        vector<itemncount> getLatestCooldowns(vector<itemncount> currentCooldowns, uint64_t block){
            return currentCooldowns;
        }   

CONTRACT_END((gameact)(incpackage)(newitem)(newpackage)(newlocation)(newrecipe)(transfer)(init)(start)(buy)(sell)(addcnct)(resetall))
