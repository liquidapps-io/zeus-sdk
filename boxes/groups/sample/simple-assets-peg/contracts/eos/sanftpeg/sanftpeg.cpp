#include "../json/json.hpp"
#include "../dappservices/link.hpp"
#define CONTRACT_NAME() sanftpeg

#undef MESSAGE_RECEIVED_HOOK
#define MESSAGE_RECEIVED_HOOK(message) message_received(message)

#undef MESSAGE_RECEIPT_HOOK
#define MESSAGE_RECEIPT_HOOK(receipt) receipt_received(receipt)

#undef MESSAGE_RECEIVED_FAILURE_HOOK
#define MESSAGE_RECEIVED_FAILURE_HOOK(message) message_received_failed(message)

#undef MESSAGE_RECEIPT_FAILURE_HOOK
#define MESSAGE_RECEIPT_FAILURE_HOOK(receipt) receipt_received_failed(receipt)

// name of asset contract to monitor transfer
#define ASSET_CODE "simpleassets"_n.value

// create a new dispatcher for this asset contract
// additional assets, or tokens could be placed here
#undef EOSIO_DISPATCH_SVC
#define EOSIO_DISPATCH_SVC(contract, methods)                                  \
  extern "C" {                                                                 \
  void apply(uint64_t receiver, uint64_t code, uint64_t action) {              \
    if (code == ASSET_CODE && action == "transfer"_n.value) {                  \
      eosio::execute_action(eosio::name(receiver), eosio::name(code),          \
                            &contract::transfer);                              \
    }                                                                          \
    else {                                                                     \
      switch (action) {                                                        \
        EOSIO_DISPATCH_HELPER(contract, DAPPSERVICE_ACTIONS_COMMANDS())        \
        EOSIO_DISPATCH_HELPER(contract, methods)                               \
        EOSIO_DISPATCH_HELPER(contract, (xsignal))                             \
      }                                                                        \
    }                                                                          \
    eosio_exit(0);                                                             \
  }                                                                            \
  }

using json = nlohmann::json;
// idata objects for NFTs to track bridging history
namespace nft {
  string orig_type = "nftOrig";
  string clone_type = "nftClone";

  struct orig_idata {
    string type;
    string origChain;
    string origTxid;
  };

  struct clone_idata {
    string type;
    string origChain;
    string origTxid;
    string thisChain;
    string thisTxid;
    string prevChain;
    string prevTxid;
    uint32_t count;
  };

  NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(orig_idata, type, origChain, origTxid)
  NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(clone_idata, type, origChain, origTxid, thisChain, thisTxid, prevChain, prevTxid, count)
}

CONTRACT_START()

  LINK_BOOTSTRAP()

  // simpleassets asset table so we can determine existing tokens
  struct sasset {
    uint64_t                id;
    name                    owner;
    name                    author;
    name                    category;
    string                  idata; // immutable data
    string                  mdata; // mutable data
    vector<sasset>          container;
    vector<account>         containerf;

    auto primary_key() const {
      return id;
    }
    uint64_t by_author() const {
      return author.value;
    }

  };
  typedef eosio::multi_index< "sassets"_n, sasset,
    eosio::indexed_by< "author"_n, eosio::const_mem_fun<sasset, uint64_t, &sasset::by_author> >
    > sassets;

  //map simple assets global table so we can determine asset ids
  struct sassetids {
			uint64_t lnftid = 100000000000000;
			uint64_t defid = 1000000;
			uint64_t mdid = 100000000;
			uint64_t spare2 = 0;
	};
	typedef eosio::singleton< "global"_n, sassetids > sassetids_table; /// singleton  

  //partial mapping of simpleassets sasset
  struct mini_sasset {
    uint64_t                id;
    name                    category;
    string                  idata; // immutable data
    string                  mdata; // mutable data
  };

  //transfer object to communicate nft bridge
  struct message_t {
    bool success;
    name from_account;
    string to_account;
    string to_chain;
    mini_sasset token;
  };

  //asset to track this specific bridge functionality
  TABLE asset_settings_t {
    string this_chain_name;
    name asset_contract;
    name asset_author; //TODO: support any author
    bool transfers_enabled;
    //TODO: Add toggle for burn/create strategy vs update/offer strategy
    //TODO: Add fee model for executing transfers
  };
  typedef eosio::singleton<"config"_n, asset_settings_t> asset_settings_table;
  typedef eosio::multi_index<"config"_n, asset_settings_t> asset_settings_table_abi; 

  TABLE asset_claim {
    uint64_t assetid;
    name owner;
    string type;    
    string code;

    auto primary_key() const {
      return assetid;
    }
  };
  typedef eosio::multi_index<"claim"_n, asset_claim> asset_claim_table; 

  [[eosio::action]]
  void init(
    name sister_code,
    string sister_chain_name,
    bool processing_enabled,
    string this_chain_name,
    name asset_contract,
    name asset_author,
    bool transfers_enabled
  )
  {
      require_auth(_self);
      initlink(
          sister_code,
          sister_chain_name,
          this_chain_name,
          processing_enabled
      );
      
      asset_settings_table settings_singleton(_self, _self.value);
      asset_settings_t settings = settings_singleton.get_or_default();
      settings.this_chain_name = this_chain_name;
      settings.asset_contract = asset_contract;
      settings.asset_author = asset_author;
      settings.transfers_enabled = transfers_enabled;
      settings_singleton.set(settings, _self);
      //Add additional init logic as neccessary
  }

  [[eosio::action]]
  void enable(bool processing_enabled, bool transfers_enabled)
  {
      require_auth(_self);
      enablelink(processing_enabled);
      asset_settings_table settings_singleton(_self, _self.value);
      asset_settings_t settings = settings_singleton.get_or_default();
      settings.transfers_enabled = transfers_enabled;
      settings_singleton.set(settings, _self);
      //Add additional enabling logic as neccessary
  }

  [[eosio::action]]
  void prepclaim(uint64_t assetid, name owner, string type, string code) {
    asset_settings_table settings_singleton(_self, _self.value);
    asset_settings_t settings = settings_singleton.get_or_default();
    require_auth(settings.asset_author);

    sassets assets_f( settings.asset_contract, owner.value );
    auto token = assets_f.require_find(assetid, "asset id does not exist for this owner");
    check(token->author == settings.asset_author, "asset author is different from settings");
    check(type != "", "must include a type");
    check(code != "", "must include a type");

    asset_claim_table asset_claims(_self, settings.asset_author.value);
    auto claim = asset_claims.find(assetid);
    if(claim == asset_claims.end()) {
      asset_claims.emplace(settings.asset_author, [&]( auto& a ){ 
        a.assetid = assetid;
        a.type = type;
        a.code = code;
      });
    } else {
      asset_claims.modify(claim, eosio::same_payer, [&]( auto& a ){ 
        a.type = type;
        a.code = code;
      });
    }
  }

  [[eosio::action]]
  void claim(uint64_t assetid, name owner, string code) {
    asset_settings_table settings_singleton(_self, _self.value);
    asset_settings_t settings = settings_singleton.get_or_default();
    require_auth(owner);

    asset_claim_table asset_claims(_self, settings.asset_author.value);
    auto claim = asset_claims.find(assetid);
    check(claim != asset_claims.end(), "Claim code does not exist for this asset id");
    check(claim->code == code, "provided claim code does not match");

    sassets assets_f( settings.asset_contract, owner.value );
    auto token = assets_f.require_find(assetid, "asset id does not exist for this owner");
    check(token->owner == owner, "asset id is not owned by owner");
    check(token->author == settings.asset_author, "asset author is different from settings");

    auto jdata = json::parse(token->mdata);
    if(!jdata.contains(claim->type)) {
      jdata.emplace(claim->type, owner.to_string());
      string mdata = jdata.dump();
      action updateAsset = action(
        permission_level{settings.asset_author, "active"_n},
        settings.asset_contract,
        "update"_n,
        std::make_tuple( settings.asset_author, owner, assetid, mdata )
      );
      updateAsset.send();
    } 
    asset_claims.erase(claim);
  }

  [[eosio::action]]
  void mint(name category, name owner, string mdata, bool claimrequired) {    
    asset_settings_table settings_singleton(_self, _self.value);
    asset_settings_t settings = settings_singleton.get_or_default();
    require_auth(settings.asset_author);

    string idata = create_idata("", get_trx_id(), settings.this_chain_name, false);

    action createAsset = action(
      permission_level{settings.asset_author, "active"_n},
      settings.asset_contract,
      "create"_n,
      std::make_tuple( settings.asset_author, category, owner, idata, mdata, claimrequired )
    );
    createAsset.send();
  }

  vector<char> message_received(const std::vector<char>& message) {
    asset_settings_table settings_singleton(_self, _self.value);
    asset_settings_t settings = settings_singleton.get_or_default();      
    auto transfer_data = eosio::unpack<message_t>(message);

    sassetids_table sassetids_singleton(settings.asset_contract, settings.asset_contract.value);
    sassetids assetids = sassetids_singleton.get_or_default();
    uint64_t id = assetids.lnftid + 1;
    string txid = get_trx_id();

    string idata = create_idata(transfer_data.token.idata, txid, settings.this_chain_name, true);
    
    //mint the recipricol asset
    action createAsset = action(
      permission_level{settings.asset_author, "active"_n},
      settings.asset_contract,
      "create"_n,
      std::make_tuple( settings.asset_author, transfer_data.token.category, name(transfer_data.to_account), idata, transfer_data.token.mdata, 1 )
    );
    createAsset.send();
  }  

  // mark message as failed and return
  vector<char> message_received_failed(const std::vector<char>& message) {
    auto failed_message = eosio::unpack<message_t>(message);
    failed_message.success = false;
    auto packed_data = eosio::pack(failed_message);
    return packed_data;
  }  

  void receipt_received(const std::vector<char>& receipt) {  
    asset_settings_table settings_singleton(_self, _self.value);
    asset_settings_t settings = settings_singleton.get_or_default();

    // issue with error 'read' here
    auto receipt_received = eosio::unpack<message_t>(receipt);
    std::string memo = "LiquidApps LiquidLink Transfer Failed - Refund Processed";

    vector<uint64_t> assetids{ receipt_received.token.id };
    //failures are not yet handled - will always be success
    if (!receipt_received.success) {
      // offer the asset back to the original owner 
      string memo = "Returning asset after unsuccessful IBC";
      action offerAsset = action(
        permission_level{settings.asset_author, "active"_n},
        settings.asset_contract,
        "offer"_n,
        std::make_tuple(settings.asset_author, name(receipt_received.from_account), assetids, memo) //TODO: Create more detailed memo from transfer response
      );
      offerAsset.send();     
    } else {
      string memo = "Burning asset after successful IBC.";
      action saBurn = action(
        permission_level{settings.asset_author, "active"_n},
        settings.asset_contract,
        "burn"_n,
        std::make_tuple(settings.asset_author, assetids, memo) //TODO: Create more detailed memo from transfer response
      );
      saBurn.send();
    }
  }

  // mark receipt as failed and store in failed messages table
  void receipt_received_failed(message_payload& receipt) { 
    auto failed_receipt = eosio::unpack<message_t>(receipt.data);
    failed_receipt.success = false;
    auto failed_receipt_packed = eosio::pack<message_t>(failed_receipt);
    receipt.data = failed_receipt_packed;
    // add failed receipt to fmessages table
    failed_messages_table_t failed_messages(_self, _self.value);
    auto failed = failed_messages.find(receipt.id);
    if(failed == failed_messages.end()) {
        failed_messages.emplace(_self, [&](auto& a){
            a.message = receipt;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
        });
    }
  }

  void transfer( name from, name to, vector< uint64_t >& assetids, string memo ) {
    asset_settings_table settings_singleton(_self, _self.value);
    asset_settings_t settings = settings_singleton.get_or_default();
    sassets assets_f( settings.asset_contract, to.value );    
    // validate proper transfer
    if (get_first_receiver() != settings.asset_contract || from == _self) {
      return;
    }
    check(settings.transfers_enabled, "transfers disabled"); 

    // to_account,to_chain is memo format
    vector<string> split_memo = split(memo, ",");
    string to_account = split_memo[0];
    string to_chain = split_memo[1];

    for ( auto i = 0; i < assetids.size(); ++i ) {
      const auto token = assets_f.find(assetids[i]);
      check(token != assets_f.end(), "Asset id: " + std::to_string(assetids[i]) + " does not exist");
      check(token->author.value == settings.asset_author.value, "Asset id: " + std::to_string(assetids[i]) + " has an unsupported author: " + token->author.to_string() + ", token author must be: " + settings.asset_author.to_string());
      check(token->container.size() == 0, "Asset id: " + std::to_string(assetids[i]) + " has attached assets. These must be detached");
      check(token->containerf.size() == 0, "Asset id: " + std::to_string(assetids[i]) + " has attached tokens. These must be detached");
      mini_sasset current_asset = { token->id, token->category, token->idata, token->mdata };
      message_t current_transfer = { true, from, to_account, to_chain, current_asset };
      auto data = eosio::pack<message_t>(current_transfer);
      pushMessage(data);
    }

    // burn nft
    // add variable in settings table
    if (false) {
        action(permission_level{_self, "active"_n}, settings.asset_contract, "burn"_n,
          std::make_tuple(_self, assetids, "burning nft"))
        .send();
    }
  }

  vector<string> split(const string& str, const string& delim) {
    vector<string> tokens;
    size_t prev = 0, pos = 0;
    do {
      pos = str.find(delim, prev);
      if (pos == string::npos) pos = str.length();
      string token = str.substr(prev, pos-prev);
      tokens.push_back(token);
      prev = pos + delim.length();
    } while (pos < str.length() && prev < str.length());
    return tokens;
  }

  template<typename CharT>
  static std::string to_hex(const CharT* d, uint32_t s) {
    std::string r;
    const char* to_hex="0123456789abcdef";
    uint8_t* c = (uint8_t*)d;
    for( uint32_t i = 0; i < s; ++i ) {
      (r += to_hex[(c[i] >> 4)]) += to_hex[(c[i] & 0x0f)];
    }
    return r;
  }

  static std::string get_trx_id() {
    size_t size = transaction_size();
    char buf[size];
    size_t read = read_transaction( buf, size );
    check( size == read, "read_transaction failed");
    auto hash = sha256( buf, read );
    auto arr = hash.extract_as_byte_array();
    return to_hex(&arr, sizeof(arr));
  }

  static std::string create_idata(std::string curr_idata, std::string thisTxid, std::string thisChain, bool clone) {
    if(!clone) {
      nft::orig_idata idata{ nft::orig_type, thisChain, thisTxid };
      json jfinal = idata;
      return jfinal.dump();
    }
    
    auto jdata = json::parse(curr_idata);
    string origChain = thisChain;
    string origTxid;
    string prevChain = origChain;
    string prevTxid;
    uint32_t count = 1;
    if(curr_idata.find(nft::orig_type) != string::npos ) {
      auto prev_history = jdata.get<nft::orig_idata>();
      origChain = prev_history.origChain;
      prevChain = origChain;
      origTxid = prev_history.origTxid;
      prevTxid = origTxid;
    }
    if(curr_idata.find(nft::clone_type) != string::npos ) {
      auto prev_history = jdata.get<nft::clone_idata>();
      origChain = prev_history.origChain;
      prevChain = prev_history.thisChain;
      origTxid = prev_history.origTxid;
      prevTxid = prev_history.thisTxid;
      count = prev_history.count + 1;
    }
    nft::clone_idata idata{ nft::clone_type, origChain, origTxid, thisChain, thisTxid, prevChain, prevTxid, count };
    json jfinal = idata;
    return jfinal.dump();
  }

CONTRACT_END((init)(enable)(mint)(prepclaim)(claim))
