#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS() 

#define CONTRACT_NAME() mockcontract 

CONTRACT_START()
  TABLE usertrack {
    name username;
    time_point_sec lastlogin;
    name mainaccname;
    bool ispremium;
    float rating;
    asset token1;
    asset token2;
    string extended;
    uint64_t primary_key()const {return username.value;}
  };
  TABLE usertrack_shardbucket {
      std::vector<char> shard_uri;
      uint64_t shard;
      uint64_t primary_key() const { return shard; }
  };

  TABLE claiminfo114 {
    name username;
    checksum256 hash;
    string attribute_key;
    name witness_contract;
    name witness_action;
    uint64_t claim_id;
    uint64_t primary_key()const {return claim_id;}
  };
  TABLE claiminfo114_shardbucket {
      std::vector<char> shard_uri;
      uint64_t shard;
      uint64_t primary_key() const { return shard; }
  };
  typedef dapp::multi_index<"usertrack"_n, usertrack> usertrack_t;
  typedef eosio::multi_index<".usertrack"_n, usertrack> usertrack_t_v_abi;
  typedef eosio::multi_index<"usertrack"_n, usertrack_shardbucket> usertrack_t_abi;

  typedef dapp::multi_index<"claiminfo114"_n, claiminfo114> claiminfo114_t;
  typedef eosio::multi_index<".claiminfo114"_n, claiminfo114> claiminfo114_t_v_abi;
  typedef eosio::multi_index<"claiminfo114"_n, claiminfo114_shardbucket> claiminfo114_t_abi;


  [[eosio::action]] void modroots1(
    uint64_t shard,
    std::vector<char> shard_uri
  ) {
    claiminfo114_t_abi _shardbucket_table(_self, _self.value);
    auto shardData = _shardbucket_table.find(shard);
    if (shardData == _shardbucket_table.end()) {
      _shardbucket_table.emplace(_self, [&]( auto& a ) {
          a.shard_uri = shard_uri;
          a.shard = shard;
      });
    } else {
      _shardbucket_table.modify(shardData, _self, [&]( auto& a ) {
          a.shard_uri = shard_uri;
      });
    }
  }

  [[eosio::action]] void logintrack(
    name username,
    time_point_sec lastlogin,
    name mainaccname,
    bool ispremium,
    float rating,
    asset token1,
    asset token2,
    string extended
  ) {
    usertrack_t usertracks(_self, _self.value, 1024, 64, true, true, 1000000);
    auto existing = usertracks.find(username.value);
    if(existing == usertracks.end())
      usertracks.emplace(_self, [&]( auto& u ){
        u.username = username;
        u.lastlogin = lastlogin;
        u.mainaccname = mainaccname;
        u.ispremium = ispremium;
        u.rating = rating;
        u.token1 = token1;
        u.token2 = token2;
        u.extended = extended;
      });
    else
      usertracks.modify(existing,_self, [&]( auto& u ){
        u.username = username;
        u.lastlogin = lastlogin;
        u.mainaccname = mainaccname;
        u.ispremium = ispremium;
        u.rating = rating;
        u.token1 = token1;
        u.token2 = token2;
        u.extended = extended;
      });
  }

  [[eosio::action]] void claimhash(
    name username,
    checksum256 hash,
    string attribute_key,
    name witness_contract,
    name witness_action,
    uint64_t claim_id
  ) {
    claiminfo114_t claiminfo(_self, _self.value, 1024, 64, true, true, 1000000);
    auto existing = claiminfo.find(claim_id);
    if(existing == claiminfo.end())
      claiminfo.emplace(_self, [&]( auto& u ){
        u.username = username;
        u.hash = hash;
        u.attribute_key = attribute_key;
        u.witness_contract = witness_contract;
        u.witness_action = witness_action;
        u.claim_id = claim_id;
      });
    else
      claiminfo.modify(existing,_self, [&]( auto& u ){
        u.username = username;
        u.hash = hash;
        u.attribute_key = attribute_key;
        u.witness_contract = witness_contract;
        u.witness_action = witness_action;
        u.claim_id = claim_id;
      });
  }

CONTRACT_END((logintrack)(claimhash))

