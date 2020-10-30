#define USE_ADVANCED_IPFS
#define IPFS_FEATURE_PRIMKEY
#define IPFS_FEATURE_MANIFEST
#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()

#define CONTRACT_NAME() ipfsconsumer

CONTRACT_START()
  TABLE testindex {
    uint64_t id;
    uint64_t sometestnumber;
    uint64_t primary_key()const {return id;}
  };

  TABLE bigentry {
    checksum256 id;
    uint64_t sometestnumber;
    checksum256 primary_key()const {return id;}
  };

  TABLE medentry {
    uint128_t id;
    uint64_t sometestnumber;
    uint128_t primary_key()const {return id;}
  };

  TABLE testentry {  
     uint64_t                      field1;
     std::vector<char>             field2;
     uint64_t                      field3;
  };  
  TABLE testindex_shardbucket {
      std::vector<char> shard_uri;
      uint64_t shard;
      uint64_t primary_key() const { return shard; }
  };

  typedef dapp::multi_index<"test"_n, testindex> testindex_t;
  typedef eosio::multi_index<".test"_n, testindex> testindex_t_v_abi;
  typedef eosio::multi_index<"test"_n, testindex_shardbucket> testindex_t_abi;
  typedef dapp::multi_index<"test1"_n, testindex> testindex1_t;
  typedef eosio::multi_index<".test1"_n, testindex> testindex1_t_v_abi;
  typedef eosio::multi_index<"test1"_n, testindex_shardbucket> testindex1_t_abi;

  #ifdef IPFS_FEATURE_PRIMKEY
  typedef dapp::advanced_multi_index<"test2"_n, bigentry, checksum256> testindex_big_t;   
  typedef dapp::advanced_multi_index<"test3"_n, medentry, uint128_t> testindex_med_t;
  typedef eosio::multi_index<".test2"_n, bigentry> testindex_bt_v_abi;
  typedef eosio::multi_index<"test2"_n, testindex_shardbucket> testindex_bt_abi;
  typedef eosio::multi_index<".test3"_n, medentry> testindex_mt_v_abi;
  typedef eosio::multi_index<"test3"_n, testindex_shardbucket> testindex_mt_abi;   
  [[eosio::action]] void testbig(checksum256 id, uint64_t value) {
    testindex_big_t testset(_self,_self.value);
    testset.emplace(_self, [&]( auto& a ){
      a.id = id;
      a.sometestnumber = value;
    });
  }

  [[eosio::action]] void checkbig(checksum256 id, uint64_t value) {
    testindex_big_t testset(_self,_self.value);
    auto const& data = testset.get(id,"data not found");
    check(data.sometestnumber == value, "value does not match");
  }

  [[eosio::action]] void testmed(uint128_t id, uint64_t value) {
    testindex_med_t testset(_self,_self.value);
    testset.emplace(_self, [&]( auto& a ){
      a.id = id;
      a.sometestnumber = value;
    });
  }

  [[eosio::action]] void checkmed(uint128_t id, uint64_t value) {
    testindex_med_t testset(_self,_self.value);
    auto const& data = testset.get(id,"data not found");
    check(data.sometestnumber == value, "value does not match");
  }
  #else
  [[eosio::action]] void testbig(checksum256 id, uint64_t value) {}
  [[eosio::action]] void checkbig(checksum256 id, uint64_t value) {}
  [[eosio::action]] void testmed(uint128_t id, uint64_t value) {}
  [[eosio::action]] void checkmed(uint128_t id, uint64_t value) {}
  #endif


  [[eosio::action]] void testfind(uint64_t id) {
    testindex_t testset(_self,_self.value);
    auto const& data = testset.get(id,"data not found");
  }
  [[eosio::action]] void testclear() {
    testindex_t testset(_self,_self.value);
    testset.clear();
  }
  
  #ifndef IPFS_FEATURE_MANIFEST
  struct manifest {
      checksum256 next_available_key;
      uint32_t shards;
      uint32_t buckets_per_shard;
      std::map<uint64_t,std::vector<char>> shardbuckets;
  };
  [[eosio::action]] void testman(manifest man) {}
  #else
  [[eosio::action]] void testman(dapp::manifest man) {
    testindex_t testset(_self,_self.value);
    testset.load_manifest(man,"Test");    
  }
  #endif
  [[eosio::action]] void testindex(uint64_t id, uint64_t sometestnumber) {
    testindex_t testset(_self,_self.value);
    testset.emplace(_self, [&]( auto& a ){
      a.id = id;
      a.sometestnumber = sometestnumber;
    });
  }

  [[eosio::action]] void testremote(name remote, uint64_t id) {
    testindex_t testset(remote,remote.value);
    auto const& data = testset.get(id,"data not found");
  }

  [[eosio::action]] void testchain(name remote, uint64_t id, name chain) {
    testindex_t testset(remote,remote.value, 1024, 64, false, false, 0, chain);
    auto const& data = testset.get(id,"data not found");
  }

  [[eosio::action]] void testindexa(uint64_t id) {
    testindex_t testset(_self,_self.value);
    testset.emplace(_self, [&]( auto& a ){
      a.id = id;
    });
  }

  [[eosio::action]] void testcollide(uint64_t id, uint64_t value) {
    testindex1_t testset(_self,_self.value, 1, 1);
    auto existing = testset.find(id);
    if(existing == testset.end())
      testset.emplace(_self, [&]( auto& a ){
        a.id = id;
        a.sometestnumber = value;
      });
    else
      testset.modify(existing,_self, [&]( auto& a ){
        a.sometestnumber = value;
      });
  }

  [[eosio::action]] void testdelay(uint64_t id, uint64_t value, uint32_t delay_sec) {
    testindex_t testset(_self,_self.value, 1024, 64, false, false, delay_sec);
    auto existing = testset.find(id);
    if(existing == testset.end())
      testset.emplace(_self, [&]( auto& a ){
        a.id = id;
        a.sometestnumber = value;
      });
    else
      testset.modify(existing,_self, [&]( auto& a ){
        a.sometestnumber = value;
      });
  }

  [[eosio::action]] void verfempty() {
    ipfsentries_t entries(_self,_self.value);
    eosio::check(entries.begin() == entries.end(),"must be empty");

  }

  [[eosio::action]] void increment(uint32_t somenumber) {
    testindex_t testset(_self,_self.value);
    testset.emplace(_self, [&]( auto& a ){
      a.id = testset.available_primary_key();
    });
  }
  [[eosio::action]] void testresize() {
    testindex_t testset(_self,_self.value,512,32);
    testset.emplace(_self, [&]( auto& a ){
      a.id = testset.available_primary_key();
    });
  }
 [[eosio::action]] void testset(testentry data) {
    auto uri = setData(data);
  }
 [[eosio::action]] void testget(std::string uri, uint32_t expectedfield) {
    eosio::check(getData<testentry>(uri).field1 == expectedfield, "wrong value");
  }
 [[eosio::action]] void testempty(std::string uri) {
    eosio::check(getRawData(uri, false, true).size() == 0, "wrong size");
  }

CONTRACT_END(
  (testset)(testget)(testempty)(increment)
  (testindex)(testindexa)(testresize)(testclear)
  (testfind)(testdelay)(xdcommit)(testman)
  (testcollide)
  (testbig)(checkbig)
  (testmed)(checkmed)
  (verfempty)
  (testremote)(testchain)
  )
