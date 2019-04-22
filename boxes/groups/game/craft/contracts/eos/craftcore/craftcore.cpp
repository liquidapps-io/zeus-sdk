#include "./craftcore.hpp"
using namespace eosio;
#include <vector>
using std::vector; 

vector<itemncount> getLatestCooldowns(vector<itemncount> currentCooldowns, uint64_t block){
    return currentCooldowns;
}

bool craftcore::validateLocationNeeds(account_name owner, location_key aLocation){
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

void craftcore::craft(account_name owner, recipe recipeData){
    
    // check location 
    bool validLocation = false;
    for (auto aLocation : recipeData.locations){
        if(validateLocationNeeds(owner, aLocation)){
            validLocation = true;
            break;
        }
    }
    eosio_assert(validLocation, "no valid locations to craft this");
    
    auto account = getCreateGameAccount(owner);
    auto cooldowns = getLatestCooldowns(account.cooldowns, 0);
    
    // TODO: check cooldown
    for (auto tool : recipeData.tools) {
        bool res = verify_invetory_count(owner, tool, 1);
        eosio_assert(res , "not enough of item" );
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
    game_accounts_table.modify( game_accounts_table.get(owner), owner, [&]( auto& account) {
        account.cooldowns = cooldowns;
        
    });
}

void craftcore::gameact (account_name owner, recipe_key the_recipe){
  require_auth( owner );
  auto account = getCreateGameAccount(owner);
  craft(owner, getRecipe(the_recipe) );
}


void craftcore::incpackage (account_name owner, package_key package){
    require_auth( owner );
    auto account = getCreateGameAccount(owner);
    std::vector<package_key> arr = account.active_packages;
    arr.push_back(package);
    game_accounts_table.modify( game_accounts_table.get(owner), owner, [&]( auto& account) {
        account.active_packages = arr;
    });
}

// mgt

void craftcore::newpackage (account_name owner,package_name name, description_t description,resource_url icon, bool is_default){
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
        games_table.modify( (games_table.get(_self)), _self , [&]( auto& s) {
            s.default_packages.push_back(newKey);
        });
    }
}
void craftcore::newitem (account_name owner,item_name name, description_t description, package_key package,uint32_t hidden, resource_url sfx,resource_url icon , bool is_default){
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
        games_table.modify( (games_table.get(_self)), _self , [&]( auto& s) {
            itemncount x;
            x.count = 1;
            x.item = newKey;
            s.default_inventory.push_back(x);
        });
    }

    
}

void craftcore::newlocation (account_name owner,location_name name, description_t description, package_key package, resource_url music, resource_url marker_icon, resource_url background,pos position, vector<item_key> reqs){
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
  
}
void craftcore::newrecipe (
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


void craftcore::transfer (account_name from, account_name to, itemncount items){
    require_auth(from);
    eosio_assert(items.count > 0,"must be positive");
    require_recipient(to);
    add_to_inventory(from, items.item,-items.count, from);
    add_to_inventory(to, items.item,items.count, from);
}



EOSIO_ABI( craftcore, (gameact)(incpackage)(newitem)(newpackage)(newlocation)(newrecipe)(transfer)(init)(start)(buy)(sell)(addcnct)(resetall) )
