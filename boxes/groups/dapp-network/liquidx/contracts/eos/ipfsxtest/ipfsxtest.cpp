#define LIQUIDX
#define USE_ADVANCED_IPFS

#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS()

#define CONTRACT_NAME() ipfsxtest

CONTRACT_START()
  TABLE testindex {
    uint64_t id;
    uint64_t sometestnumber;
    uint64_t primary_key()const {return id;}
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

  [[eosio::action]] void testindexa(uint64_t id) {
    testindex_t testset(_self,_self.value);
    testset.emplace(_self, [&]( auto& a ){
      a.id = id;
    });
  }

  [[eosio::action]] void testfind(uint64_t id) {
    testindex_t testset(_self,_self.value);
    auto const& data = testset.get(id,"data not found");
  }

  [[eosio::action]] void testremote(name remote, uint64_t id) {
    testindex_t testset(remote,remote.value);
    auto const& data = testset.get(id,"data not found");
  }

  [[eosio::action]] void testchain(name remote, uint64_t id, name chain) {
    testindex_t testset(remote, remote.value, 1024, 64, false, false, 0, chain);
    auto const& data = testset.get(id,"data not found");
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

  [[eosio::action]] void verfempty() {
    ipfsentries_t entries(_self,_self.value);
    eosio::check(entries.begin() == entries.end(),"must be empty");

  }
CONTRACT_END((testset)(testget)(testempty)(increment)(testindexa)(testfind)(testremote)(testchain)(testresize)(testdelay)(xdcommit)(testcollide)(verfempty))
