#include "../dappservices/oracle.hpp"
#include "../dappservices/readfn.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  ORACLE_DAPPSERVICE_ACTIONS \
  READFN_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS() \
  READFN_SVC_COMMANDS() 
  
#define CONTRACT_NAME() airdrop 
struct token_account {
    asset    balance;
    uint64_t primary_key() const { return balance.symbol.code().raw(); }
};
typedef eosio::multi_index<"accounts"_n, token_account> token_accounts;

CONTRACT_START()

  //scope to token contract
  struct [[eosio::table("airdrops")]] airdrop_t {    
    symbol token;
    name issuer;
    string url_prefix;
    string memo;
  };

  //scope to token contract

  struct [[eosio::table("grabs")]] grabbed {
    name owner;
    uint64_t primary_key() const { return owner.value; }
  };

  typedef eosio::singleton<"airdrops"_n, airdrop_t> airdrops;
  typedef eosio::multi_index<"grabs"_n, grabbed> grabs;
  



 // contract owner
 [[eosio::action]] void init(name issuer, name token_contract, symbol token_symbol, string url_prefix, string memo) {
   require_auth(_self);
   airdrops airdrops_table(_self, token_contract.value);
   airdrop_t modified_airdrop;
   modified_airdrop.issuer = issuer;
   modified_airdrop.token = token_symbol;
   modified_airdrop.url_prefix = url_prefix;
   modified_airdrop.memo = memo;
   airdrops_table.set(modified_airdrop, _self);
 }
 
 // anyone
 [[eosio::action]] void grab(name owner, name token_contract) {
   require_auth(owner);
   require_recipient(owner);

   auto current_airdrop = get_airdrop(token_contract);

   token_accounts accountstable( token_contract, owner.value );
   auto ac = accountstable.find( current_airdrop.token.code().raw() );
   eosio::check(ac != accountstable.end() , "must have balance entry for token (run the 'open' action in the token contract)");
   mark_claimed(token_contract, owner);
   auto amount = get_amount_for_account(owner, token_contract);
   eosio::check(amount > 0, "nothing to claim");
   asset quantity;
   quantity.symbol = current_airdrop.token;
   quantity.amount = amount;
   action(permission_level{_self, "active"_n},
     token_contract, "transfer"_n,
     std::make_tuple(_self, owner, quantity, current_airdrop.memo))
      .send();
 }

 [[eosio::action]] void cleanup(name owner, name token_contract) {
   require_recipient(owner);
   grabs grabs_table(_self, token_contract.value);
   auto existing = grabs_table.find(owner.value);
   eosio::check(existing != grabs_table.end(), "nothing to cleanup");

   auto current_airdrop = get_airdrop(token_contract);
   asset quantity;
   quantity.symbol = current_airdrop.token;

   
   auto amount = get_amount_for_account(owner, token_contract);
   eosio::check(amount == 0, "can only cleanup claimed accounts");
   
   // remove claimed entry
   grabs_table.erase(existing);
 }
 
 // issuer
 [[eosio::action]] void issueairdrop(name owner, name token_contract, asset quantity, string memo) {
    auto current_airdrop = get_airdrop(token_contract);
    require_auth(current_airdrop.issuer);
    require_recipient(owner);
 }
  
  uint64_t get_amount_for_account(name account, name token_contract) {
    auto current_airdrop = get_airdrop(token_contract);
    auto prefix = current_airdrop.url_prefix;
    auto uri = prefix + account.to_string();
    std::vector<char> urivec(uri.begin(), uri.end());
    auto binary_data = getURI(urivec, [&]( auto& results ) { return results[0].result;});
    auto data_size = binary_data.size() / 2;
    std::string str(binary_data.begin(), binary_data.end());

    auto result = stoi(str);
    return result;
  }
  
 airdrop_t& get_airdrop(name token_contract){
   airdrops airdrops_table(_self, token_contract.value);
   auto current_airdrop =  airdrops_table.get();
   return current_airdrop;
 }

 void mark_claimed(name token_contract, name owner){
   grabs grabs_table(_self, token_contract.value);
   auto existing = grabs_table.find(owner.value);
   eosio::check(existing == grabs_table.end(), "already claimed");
   grabs_table.emplace(owner,[&](auto& grabbed_entry){
      grabbed_entry.owner = owner;
   });
 }
 
 [[eosio::action]] void readamount(name account, name token_contract) {
    auto amount = get_amount_for_account(account, token_contract);
    READFN_RETURN(std::string(fc::to_string(amount)));
 }
CONTRACT_END((init)(grab)(issueairdrop)(readamount))