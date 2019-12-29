#pragma once
#include "advanced_multi_index.hpp"

namespace dapp {
    
    using namespace eosio;
    using namespace std;

template <name::raw TableName,typename T, typename... Indices>
class multi_index : public advanced_multi_index<TableName,T,uint64_t,Indices...>{
    public:
    multi_index( name code, uint64_t scope, uint32_t shards = 1024,uint32_t buckets_per_shard = 64, bool pin_shards = false, bool pin_buckets = false, uint32_t cleanup_delay = 0)
      : advanced_multi_index<TableName,T,uint64_t,Indices...>(code, scope, shards, buckets_per_shard, pin_shards, pin_buckets, cleanup_delay)
      {                    
      }
};
}