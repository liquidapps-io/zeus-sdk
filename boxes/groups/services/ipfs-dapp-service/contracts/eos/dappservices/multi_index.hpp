#pragma once
#include "plisttree.hpp"
#define SUBLIST_SIZE 128


#include <vector>
#include <tuple>
#include <boost/hana.hpp>
#include <functional>
#include <utility>
#include <type_traits>
#include <iterator>
#include <limits>
#include <algorithm>
#include <memory>
#include <cmath>
#include <eosio/action.hpp>
#include <eosio/name.hpp>
#include <eosio/serialize.hpp>
#include <eosio/datastream.hpp>
#include <eosio/crypto.hpp>
#include <eosio/singleton.hpp>

namespace dapp {
    
    using namespace eosio;
    using namespace std;

namespace _multi_index_detail {

   namespace hana = boost::hana;

//   template<typename T>
//   struct secondary_index_db_functions;

   template<typename T>
   struct secondary_key_traits;

//   WRAP_SECONDARY_SIMPLE_TYPE(idx64,  uint64_t)
   MAKE_TRAITS_FOR_ARITHMETIC_SECONDARY_KEY(uint64_t)

//   WRAP_SECONDARY_SIMPLE_TYPE(idx128, uint128_t)
  MAKE_TRAITS_FOR_ARITHMETIC_SECONDARY_KEY(uint128_t)

//   WRAP_SECONDARY_SIMPLE_TYPE(idx_double, double)
   template<>
   struct secondary_key_traits<double> {
      static constexpr double true_lowest() { return -std::numeric_limits<double>::infinity(); }
   };

//   WRAP_SECONDARY_SIMPLE_TYPE(idx_long_double, long double)
   template<>
   struct secondary_key_traits<long double> {
      static constexpr long double true_lowest() { return -std::numeric_limits<long double>::infinity(); }
   };

//   WRAP_SECONDARY_ARRAY_TYPE(idx256, eosio::checksum256)
   template<>
   struct secondary_key_traits<eosio::checksum256> {
      static constexpr eosio::checksum256 true_lowest() { return eosio::checksum256(); }
   };

//   WRAP_SECONDARY_ARRAY_TYPE(idx256, eosio::fixed_bytes<32>)
//   template<>
//   struct secondary_key_traits<eosio::fixed_bytes<32>> {
//       static constexpr eosio::fixed_bytes<32> true_lowest() { return eosio::fixed_bytes<32>(); }
//   };

}


template<typename TKEY>
struct skv_t{
    TKEY key;
    uint64_t primary_key;
};

#define MAX_SLOTS 4
#define MIN_SLOTS 2

#define MAX_NODES 4
#define MIN_NODES 2

// // https://github.com/bingmann/stx-btree/blob/master/include/stx/btree.h
template<typename TKEY, typename TVALUE>
struct btree_t{
        struct btreenode_t{
        plistentry _entry;
        bool _inited = false;
        std::vector<btreenode_t> _children;
        std::vector<TKEY> _keys;
        std::vector<TVALUE> _values;
        
        btreenode_t(){
            _entry = plistentry();
        }
        btreenode_t(plistentry entry):_entry(entry){}
        void init(){
            if(_inited)
                return;
            _inited = true;
            
            auto children = _entry.getPLVec();
            for (auto child : children) {
                switch(child.pred.basic.code){
                    case PRED_CHILD:
                        _children.insert(_children.end(), btreenode_t(child));
                        break;
                    case PRED_INDEX_KEY:
                        _keys.insert(_keys.end(), child.template getObject<TKEY>());
                        break;
                    case PRED_VALUE:
                        _values.insert(_values.end(), child.template getObject<TVALUE>());
                        break;
                }
            }
        }
        
        // for branch node
        bool is_full(){
            if(is_leaf()){
                return _children.size() >= MAX_SLOTS;    
            }
            else{
                return _children.size() >= MAX_NODES;
            }
            
        }
        
        bool is_underflow(){
            if(is_leaf()){
                return _children.size() < MIN_SLOTS;    
            }
            else{
                return _children.size() < MIN_NODES;
            }
        }
        
        bool is_few(){
            if(is_leaf()){
                return _children.size() <= MIN_SLOTS;    
            }
            else{
                return _children.size() <= MIN_NODES;
            }
        }

        std::vector<btreenode_t> get_children(){
            init();
            return _children;
        }
        std::vector<TKEY> get_keys(){
            init();
            return _keys;
        }
    
        bool is_leaf(){
            init();
            return _children.size() == 0;
        }
        
        // for branch nodes
        TKEY max_key(){
            init();
            return _keys[_keys.size()]; // last key
        }
        
        TKEY min_key(){
            init();
            return _keys[0]; // first key
        }
        
        std::vector<TVALUE> get_values(){
            init();
            return _values;
        }
        
        template <typename T>
        static std::vector<std::vector<T>> split_vector(std::vector<T> original){
            std::size_t const half = original.size() / 2;
            auto result = std::vector<std::vector<T>>();
            result.push_back(std::vector<T>(original.begin(), original.begin() + half));
            result.push_back(std::vector<T>(original.begin() + half, original.end()));
            return result;
        }
        
        std::vector<btreenode_t> split(){
            auto keys = split_vector(_keys);
            btreenode_t first; 
            btreenode_t second;
            first._keys = keys[0];
            second._keys = keys[1];
            if(is_leaf()){
                // return 2 leafs
                auto values = split_vector(_values);
                first._values = values[0];
                second._values = values[1];
            }
            else{
                // return 2 branches
                auto children = split_vector(_children);
                first._children = children[0];
                second._children = children[1];
            }
            std::vector<btreenode_t> result;
            result.push_back(first);
            result.push_back(second);
            return result;
        }
        
        void commit(){
            std::vector<plistentry> result;
            // write keys
            for (auto key : _keys) {
                plistentry key_entry;
                key_entry << key;
                key_entry.pred.basic.code = PRED_INDEX_KEY;
                result.insert(result.end(), key_entry);
            }
            
            if(_children.size() > 0){
                // write nodes
                for (auto child : _children) 
                    result.insert(result.end(), child._entry);
                
            }
            else{
                // leaf
                // write values
                for (auto value : _values) {
                    plistentry value_entry;
                    value_entry << value;
                    value_entry.pred.basic.code = PRED_INDEX_KEY;
                    result.insert(result.end(), value_entry);
                }
            }
            _entry << result;
        }
    };
    
     struct btree_path_t{
        btreenode_t root;
        std::vector<btreenode_t> children;
        std::vector<uint8_t> positions;
        TVALUE value;
        
        void _populate_children_vector(){
            auto current = root;
            for (int i = 0; i < positions.size()-1; i++) {
                current = current.get_children()[positions[i]];
                children[i] = current;
            }
            value = children[children.size()].get_values()[positions[positions.size()-1]];
        }
        btree_path_t operator++(int){
            for (int i = positions.size()-1; i >= 0; i--) {
                if(positions[i] < (i == positions.size()-1 ? children[i].get_values().size()-1 : children[i].get_children().size()-1)){
                    positions[i] += 1;
                    break;
                }
                else{
                    positions[i] = 0;
                }
            }
            _populate_children_vector();
            return *this;
        }
        
        btree_path_t operator--(int){
            for (int i = positions.size()-1; i >= 0; i--) {
                if(positions[i] > 0){
                    positions[i] -= 1;
                    break;
                }
                else{
                    positions[i] = i == positions.size()-1 ? children[i].get_values().size()-1 : children[i].get_children().size()-1;
                }
            }
            _populate_children_vector();
            return *this;
        }
    };
    

    
    
    // https://mitpress.mit.edu/books/introduction-algorithms-third-edition
    btreenode_t _root = btreenode_t();
public:
    struct const_iterator : public std::iterator<std::bidirectional_iterator_tag, const TVALUE> {
          public:
              friend bool operator == ( const const_iterator& a, const const_iterator& b ) {
                 return a.current.primary_key == b.current.primary_key;
              }
              friend bool operator != ( const const_iterator& a, const const_iterator& b ) {
                 return a.current.primary_key != b.current.primary_key;
              }

              const TVALUE& operator*()const { return _path->value; }
              const TVALUE* operator->()const { return _path->value; }

              const TVALUE& get()const { return _path->value; }
              
              const_iterator operator++(int){
                 const_iterator result(*this);
                 ++(*this);
                 return result;
              }

              const_iterator operator--(int){
                 const_iterator result(*this);
                 --(*this);
                 return result;
              }

              const_iterator& operator++() {

                 return *this;
              }

              const_iterator& operator--() {
                 
                 return *this;
              }

              const_iterator():_path(nullptr){}
          private:
              friend struct index;
              const_iterator( const btree_t* idx, btree_path_t* path )
              : _idx(idx),_path(path) {}

              const btree_t* _idx;
              const btree_path_t* _path;
        }; /// struct btree_t::const_iterator


    btree_t(plistentry& root):_root(btreenode_t(root)){}
    btree_t(){
        // _root.data_type = plistentry::DT_PLIST_ENTRY_POINTER;
        _root._entry.data_is_array = plistentry::IA_ARRAY;
    }
    const_iterator find(TKEY key) const {
        // find list
        // construct iterator
        const_iterator itr;
        
        return itr;
    }
    
    void modify(TKEY oldKey, TKEY newKey, TVALUE value){
        erase(oldKey);
        add(newKey, value);
    }
    
    void erase(TKEY key){
        remove(key);
    }
    
    void add(TKEY key, TVALUE value){
        insert(key, value);
    }

private:
   
    btree_path_t tree_search(TKEY key){
        btree_path_t result;
        result.root = _root;
        auto node = _root;
        bool found;
        while(!node.is_leaf()){
            // search
            found = false;
            auto children = node.get_children();
            auto keys = node.get_keys();
            for (int i = 0; i < keys.size(); i++) {
                auto max_key_for_child = keys[i];
                if(key > max_key_for_child)
                    continue;
                
                // found
                node = children[i];
                result.children.push_back(node);
                result.positions.push_back(i);
                found = true;
                break;
            }
            if(!found){
                // bigger than last key (bucket n-1)
                node = children[children.size()-1];
                result.children.push_back(node);
                result.positions.push_back(children.size()-1);
            }
        }
        // lookup value
        auto vkeys = node.get_keys();
        auto values = node.get_values();
        int8_t pos = -1;
        for (int i = 0; i < vkeys.size(); i++) {
            auto current_key = vkeys[i];
            if(key == current_key){
               pos = i; 
            }
        }
        if(pos < 0){
            pos = 0;
        }
        else{
            result.value = values[pos];    
        }
        result.positions.push_back(pos);
        
        return result;
    }
    
    void remove(TKEY key){
        auto path = tree_search(key, _root);
        auto nodes = path.children;
        auto node = nodes[nodes.size()-1];
        auto values = node.get_values();
        auto keys = node.get_keys();
        auto found = false;
        // insert the value in place
        for (int i = 0; i < keys.size(); i++) {
            found = keys[i] == key;
            if(!found)
                continue;
            node._values.erase(node._values.begin() + i);
            node._keys.erase(node._keys.begin() + i);
            return;
        }
        eosio::check(found, "not found");
        
        if(node.is_underflow()){
            // merge
        }else{
            node.commit();
        }
        
    }
    
    void insert(TKEY key, TVALUE value){
        auto path = tree_search(key);
        auto nodes = path.children;
        auto node = _root;
        if(nodes.size() > 0){
            node = nodes[nodes.size()-1];
        }

        auto values = node.get_values();
        auto keys = node.get_keys();
        auto found = false;
        // insert the value in place
        for (int i = 0; i < keys.size(); i++) {
            eosio::check(keys[i] != key, "already exists");
            found = keys[i] >= key;
            if(!found)
                continue;
            node._values.insert(node._values.begin() + i, value);
            node._keys.insert(node._keys.begin() + i, key);
        }

        if(!found){
            // append
            node._values.insert(node._values.end(), value);
            node._keys.insert(node._keys.end(), key);
        }
        std::vector<btreenode_t> splitted;
        
        if(node.is_full()){
            splitted = node.split();
        }
        else{
            node.commit();
            splitted = std::vector<btreenode_t>();
            splitted.push_back(node);
        }
        for (int i = path.children.size()-2; i >= 0; i--) {
            auto parent = path.children[i];
            auto position = path.positions[i];
            
            
            // replace child at key with splitted children
            
            // remove current children at position
            parent._children.erase(parent._children.begin()+position);
            
            // should be either 1 or 2 elements
            for (int splittedIdx = 0; splittedIdx < splitted.size(); splittedIdx++) {
                auto newNode = splitted[splittedIdx];
                parent._children.insert(parent._children.begin() + position + splittedIdx, newNode);
                if(splittedIdx != splitted.size() - 1){
                    auto key = newNode.max_key();
                    parent._keys.insert(parent._keys.begin() + position, key);
                }
            }
            if(!parent.is_full()){
                // need to split
                splitted = parent.split();
            }
            else{
                parent.commit();
                splitted = std::vector<btreenode_t>();
                splitted.push_back(parent);
            }
        }
        
        if(splitted.size() > 1){
            btreenode_t new_root;
            // handle split root - replace root    
            new_root._keys.push_back(splitted[0].max_key());
            new_root._children.push_back(splitted[0]);
            new_root._children.push_back(splitted[0]);
            new_root.commit();
            _root = new_root;
        }
        else
            _root = splitted[0];
    }

};


struct kv_t{
    uint64_t scope;
    uint64_t key;
    name payer;
    ipfsmultihash_t value;
};

struct bucketParsedParts_t{
    vector<char> after;
    vector<char> before;
    
    uint64_t key;
    uint64_t scope;
    ipfsmultihash_t value;
    bool include = false;
};

#define emptyentry() vector<char>()

static std::vector<char> _combineParsedBucketParts(bucketParsedParts_t parts)
{
  auto result = parts.before;
  char* chars;
  if(parts.include){
      chars = reinterpret_cast<char*>(&parts.scope);
      result.insert(result.end(), chars, chars + 8);
      chars = reinterpret_cast<char*>(&parts.key);
      result.insert(result.end(), chars, chars + 8);
    //   chars = reinterpret_cast<char*>(parts.value.data());
      result.insert(result.end(), parts.value.begin(), parts.value.end());
  }
  auto remains = parts.after;
  result.insert(result.end(), remains.begin(), remains.end());
  
  return result;
}
// todo: improve with binary search
static bucketParsedParts_t _parseCacheBucket(vector<char> dictStr, uint64_t scope, uint64_t key)
{
    auto bucketSize = dictStr.size();
    bucketParsedParts_t bucketParsedParts;
    auto bucketBegin = dictStr.begin();
    auto bucketEnd = bucketBegin + bucketSize;
    
    auto empty = emptyentry();
    bucketParsedParts.value = empty;
    bucketParsedParts.after = empty;
    bucketParsedParts.before = dictStr;
    bucketParsedParts.key = key;
    bucketParsedParts.scope = scope;
    auto currentIter = bucketBegin;
    uint8_t keyLength = 8;
    uint8_t dataLength = 36;
    while(currentIter < bucketEnd)
    {
        auto entryStart = currentIter;
        
        
        // read scope
        // auto current_value = (vector<uint64_t>(currentIter, currentIter + (keyLength*2)));
        auto currentScope = *reinterpret_cast<uint64_t *>( &(currentIter)[0] );
        auto currentKey = *reinterpret_cast<uint64_t *>( &(currentIter+keyLength)[0] );
        // uint64_t currentScope = current_value[0];
        // uint64_t currentKey = current_value[1];

  

        if(scope < currentScope){
            currentIter += (keyLength*2) + dataLength;
            continue;
        }
        // read key
        if(currentKey < key){
            // if smaller, continue
            currentIter += (keyLength*2) + dataLength;
            continue;
        }
        currentIter += (keyLength*2);
        // found position
        auto before = (vector<char>(bucketBegin, entryStart));
        bucketParsedParts.before = before;
        auto copyEndPosition = entryStart;
        if(currentKey == key && currentScope == scope){
            // found key
            auto current_value_multihash_v = (vector<char>(currentIter, currentIter + dataLength));
            
            // ipfsmultihash_t *current_value_multihash_p = (ipfsmultihash_t *) malloc(32);
            // memcpy(current_value_multihash_p , current_value_multihash_v.data(), 32 );
            
            ipfsmultihash_t current_value_multihash = current_value_multihash_v;
            // ipfsmultihash_t current_value_multihash = *reinterpret_cast<ipfsmultihash_t *>( &(current_value_multihash_v)[0] );
            bucketParsedParts.value = current_value_multihash;
            currentIter += dataLength;
            copyEndPosition = currentIter;
            bucketParsedParts.include = true;
        }
        auto after = (vector<char>(copyEndPosition, bucketEnd));
        bucketParsedParts.after = after;
        break;
    }
    // append.
    return bucketParsedParts;
}

uint64_t _calcBucket(vector<char> fullKey){
    auto buffer = fullKey;
    char* c = (char*) malloc(buffer.size()+1);
    memcpy(c, buffer.data(), buffer.size());
    c[buffer.size()] = 0;
    capi_checksum256 *hash_val = (capi_checksum256 *) malloc(32); 
    sha256(c, buffer.size(), hash_val); 
    uint64_t * p64a = (uint64_t*) malloc(32);
    memcpy(p64a, hash_val, 32 );
    uint64_t res = *(p64a+3);
    return res;
}
struct bucket_t{
    uint32_t bucket;
    uint32_t shard;
    uint64_t key;
    uint64_t scope;
};
static inline vector<char> decode(string value){
    auto str = value;
  vector<char> data(str.begin(), str.end());
  return data;
}
struct shardbucket_data {
    std::vector<ipfsmultihash_t> values;
};

TABLE shardbucket {
    ipfsmultihash_t shard_uri;
    uint64_t shard;
    uint64_t primary_key() const { return shard; }
};
//add a vconfig table
//scope is the table name, index is the table scope
//default everything to zero for uninitialized
TABLE vconfig {
    uint64_t next_available_key = 0;
    uint32_t shards = 0;
    uint32_t buckets_per_shard = 0; 
};

template<name::raw TableName>
class sharded_hashtree_t{
    uint32_t _shards;
    uint32_t _buckets_per_shard; 
    uint64_t _scope; 
    uint32_t _cleanup_delay;
    bool _pin_shards;
    bool _pin_buckets;


    public:

    // struct bucket_data_t {
    //     std::vector<kv_t> values;
    // };   

    uint32_t get_shards()const  { return _shards; }
    uint32_t get_buckets()const { return _buckets_per_shard; }

    
    typedef eosio::multi_index<TableName, shardbucket> shardbucket_t;
    
    
    
    
    sharded_hashtree_t(uint64_t scope, uint32_t shards = 1024,uint32_t buckets_per_shard = 64, bool pin_shards = false, bool pin_buckets = false, uint32_t cleanup_delay = 0){
        _shards = shards;
        _buckets_per_shard = buckets_per_shard;
        _scope = scope;
        _pin_buckets = pin_buckets;
        _pin_shards = pin_shards;
        _cleanup_delay = cleanup_delay;
    }
    
    ipfsmultihash_t* get(uint64_t primary) const{
        auto sb = getBucketShard(primary);
        auto bucketData = getBucket(sb, true);
        bucketParsedParts_t bucketParsedParts = _parseCacheBucket(bucketData,  sb.scope,  sb.key);
        if(!bucketParsedParts.include)
            return NULL;
        auto value = bucketParsedParts.value;
        return new ipfsmultihash_t(value);
    }
    
    void add(uint64_t primary, ipfsmultihash_t value, name payer){
        auto sb = getBucketShard(primary);
        auto bucketData = getBucket(sb, false);
        bucketParsedParts_t bucketParsedParts = _parseCacheBucket(bucketData,  sb.scope,  sb.key);
        eosio::check(!bucketParsedParts.include, "key already exists");
        bucketParsedParts.value = value;
        bucketParsedParts.include = true;
        bucketData = _combineParsedBucketParts(bucketParsedParts);
        setBucket(sb, bucketData);
    }
    
    void set(uint64_t primary, ipfsmultihash_t value, name payer){
        auto sb = getBucketShard(primary);
        auto bucketData = getBucket(sb, false);
        bucketParsedParts_t bucketParsedParts = _parseCacheBucket(bucketData,  sb.scope,  sb.key);
        eosio::check(bucketParsedParts.include, "key not found");
        bucketParsedParts.value = value;
        bucketData = _combineParsedBucketParts(bucketParsedParts);
        setBucket(sb, bucketData);
    }
    
    void erase(uint64_t primary){
        auto sb = getBucketShard(primary);
        auto bucketData = getBucket(sb, false);
        bucketParsedParts_t bucketParsedParts = _parseCacheBucket(bucketData,  sb.scope,  sb.key);
        eosio::check(bucketParsedParts.include, "key not found");
        // remove key
        bucketParsedParts.include = false;
        bucketData = _combineParsedBucketParts(bucketParsedParts);
        // set value
        setBucket(sb, bucketData);
    }
    
    
  private:
    bucket_t& getBucketShard(uint64_t primary) const{
        bucket_t result;
        result.key = primary;
        // concate with scope
        auto fullkey = decode(name(_scope).to_string() + "-" + name(primary).to_string());
        auto hash = _calcBucket(fullkey);
        result.bucket = hash & (_buckets_per_shard-1);
        result.shard = (hash >> 6) & (_shards-1);
        result.scope = _scope;
        return *(new bucket_t(result));
    }
    
    // add cache for shard data and bucket
    std::vector<char> getBucket(bucket_t& sb, bool pin = false) const{
        // get pointer from RAM
        auto _self = current_receiver();
        shardbucket_t _shardbucket_table(_self,current_receiver().value);
        auto shardData = _shardbucket_table.find(sb.shard);
        if(shardData == _shardbucket_table.end()){
            auto emptyDataHash = uri_to_ipfsmultihash(ipfs_svc_helper::setRawData(emptyentry(), true));
            shardbucket_data newBucketData;
            newBucketData.values = std::vector<ipfsmultihash_t>();
            for (int i = 0; i < _buckets_per_shard; i++) {
                newBucketData.values.insert(newBucketData.values.end(),emptyDataHash);
            }
            auto new_shard_pointer = uri_to_ipfsmultihash(ipfs_svc_helper::setData(newBucketData, true, _cleanup_delay));
            _shardbucket_table.emplace(_self, [&]( auto& a ) {
                // new dataset
                a.shard_uri = new_shard_pointer;
                a.shard = sb.shard;
            });
            return emptyentry();
        }
        else
        {
            auto shard_uri = shardData->shard_uri;
            // get data 
            auto bucket_data = ipfs_svc_helper::getData<shardbucket_data>(ipfsmultihash_to_uri(shard_uri), _pin_shards && pin, false, _cleanup_delay);
            auto bucket_uri = bucket_data.values[sb.bucket];
            auto bucket_raw_data = ipfs_svc_helper::getRawData(ipfsmultihash_to_uri(bucket_uri), _pin_buckets && pin, false, _cleanup_delay);
            // read and return data
            return bucket_raw_data;
            
        }
    }
    
    void setBucket(bucket_t& sb, std::vector<char> data){
        shardbucket_t _shardbucket_table(current_receiver(),current_receiver().value);
        auto shardData = _shardbucket_table.find(sb.shard);
        eosio::check(shardData != _shardbucket_table.end(), "shard not found");
        auto shard_uri = shardData->shard_uri;
        auto bucket_data = ipfs_svc_helper::getData<shardbucket_data>(ipfsmultihash_to_uri(shard_uri), false, false, _cleanup_delay);
        
        // // commit bucket data
        auto new_pointer = uri_to_ipfsmultihash(ipfs_svc_helper::setRawData(data, _pin_buckets, _cleanup_delay));

        
        // // replace 
        bucket_data.values[sb.bucket] = new_pointer;
        // // commit bucketdata
        auto new_shard_pointer = uri_to_ipfsmultihash(ipfs_svc_helper::setData(bucket_data, _pin_shards, _cleanup_delay));
        // // set shard in RAM
        _shardbucket_table.modify(shardData, same_payer, [&]( auto& a ) {
            a.shard_uri = new_shard_pointer;
        });
    }
};


template <name::raw TableName,typename T, typename... Indices>
class multi_index{
    static_assert( sizeof...(Indices) <= 16, "multi_index only supports a maximum of 16 secondary indices" );
    
    constexpr static bool validate_table_name( name n ) {
     // Limit table names to 12 characters so that the last character (4 bits) can be used to distinguish between the secondary indices.
     return n.length() < 13; //(n & 0x000000000000000FULL) == 0;
    }
    
    constexpr static size_t max_stack_buffer_size = 512;
    
    static_assert( validate_table_name( name(TableName) ), "multi_index does not support table names with a length greater than 12");


    name     _code;
    uint64_t _scope;  
    uint32_t _cleanup_delay;
    typedef eosio::singleton<".vconfig"_n, vconfig> vconfig_sgt;   
    sharded_hashtree_t<TableName> primary_hashtree;

  struct item : public T
  {
     template<typename Constructor>
     item( const multi_index* idx, Constructor&& c )
     :__idx(idx){
        c(*this);
     }

     const multi_index* __idx;
     int32_t            __primary_itr;
     int32_t            __iters[sizeof...(Indices)+(sizeof...(Indices)==0)];
  };

  struct item_ptr
  {
     item_ptr(std::unique_ptr<item>&& i, uint64_t pk, int32_t pitr)
     : _item(std::move(i)), _primary_key(pk), _primary_itr(pitr) {}

     std::unique_ptr<item> _item;
     uint64_t              _primary_key;
     int32_t               _primary_itr;
  };

  mutable std::vector<item_ptr> _items_vector;
        struct indexData{
            std::vector<char> rootNode;
        };


    template<uint64_t I>
    struct intc { enum e{ value = I }; operator uint64_t()const{ return I; }  };
struct b_const_iterator : public std::iterator<std::bidirectional_iterator_tag, const T> {
         friend bool operator == ( const b_const_iterator& a, const b_const_iterator& b ) {
            return a._inner == b._inner;
         }
         friend bool operator != ( const b_const_iterator& a, const b_const_iterator& b ) {
            return a._inner != b._inner;
         }

         const T& operator*()const { 
             auto iter = (*_inner);
             auto ipfsHash = iter.get();
             T& obj = ipfs_svc_helper::getData<T>(ipfsmultihash_to_uri(ipfsHash), false, false, _cleanup_delay);
             return obj;
         }
         const T* operator->()const { 
             auto iter =  (*_inner);
             auto ipfsHash = iter.get();
             return new T(ipfs_svc_helper::getData<T>(ipfsmultihash_to_uri(ipfsHash), false, false, _cleanup_delay));
         }

         b_const_iterator operator++(int) {
            b_const_iterator result(*this);
            ++(*this);
            return result;
         }

         b_const_iterator operator--(int) {
            b_const_iterator result(*this);
            --(*this);
            return result;
         }

         b_const_iterator& operator++() {
            eosio::check( _inner != nullptr, "cannot increment end iterator" );
            (*_inner)++;
            // uint64_t next_pk;
            // auto next_itr = db_next_i64( _item->__primary_itr, &next_pk );
            // if( next_itr < 0 )
            //   _item = nullptr;
            // else
            //   _item = &_multidx->load_object_by_primary_iterator( next_itr );
            return *this;
         }
         b_const_iterator& operator--() {
            // uint64_t prev_pk;
            // int32_t  prev_itr = -1;

            // if( !_item ) {
            // //   auto ei = db_end_i64(_multidx->get_code().value, _multidx->get_scope(), static_cast<uint64_t>(TableName));
            //   eosio::check( ei != -1, "cannot decrement end iterator when the table is empty" );
            // //   prev_itr = db_previous_i64( ei , &prev_pk );
            //   eosio::check( prev_itr >= 0, "cannot decrement end iterator when the table is empty" );
            // } else {
            // //   prev_itr = db_previous_i64( _item->__primary_itr, &prev_pk );
            //   eosio::check( prev_itr >= 0, "cannot decrement iterator at beginning of table" );
            // }
            (*_inner)--;
            // _item = &_multidx->load_object_by_primary_iterator( prev_itr );
            return *this;
         }
            b_const_iterator( const multi_index* mi, btree_t<uint64_t,ipfsmultihash_t>::const_iterator* i = nullptr )
            :_multidx(mi),_inner(i){}
         private:


            const multi_index* _multidx;
            btree_t<uint64_t,ipfsmultihash_t>::const_iterator*        _inner;
            friend class multi_index;
      }; /// struct multi_index::b_const_iterator


struct h_const_iterator : public std::iterator<std::bidirectional_iterator_tag, const T> {
         friend bool operator == ( const h_const_iterator& a, const h_const_iterator& b ) {
            return a._inner == b._inner;
         }
         friend bool operator != ( const h_const_iterator& a, const h_const_iterator& b ) {
            return a._inner != b._inner;
         }

         const T& operator*()const { 
             return *_inner;
         }
         const T* operator->()const { 
            //  auto ipfsHash = iter.get();
            //  return new T(ipfs_svc_helper::getData<T>(ipfsmultihash_to_uri(ipfsHash)));
            return _inner;
         }

         h_const_iterator operator++(int) {
            h_const_iterator result(*this);
            return result;
         }

         h_const_iterator operator--(int) {
            h_const_iterator result(*this);
            return result;
         }

         h_const_iterator& operator++() {
            eosio::check( _inner != nullptr, "cannot increment end iterator" );
            return *this;
         }
         h_const_iterator& operator--() {
            return *this;
         }
            h_const_iterator( const multi_index* mi, T* i = nullptr )
            :_multidx(mi),_inner(i){}
         private:


            const multi_index* _multidx;
            T*        _inner;
            friend class multi_index;
      }; /// struct multi_index::h_const_iterator


typedef h_const_iterator const_iterator;
      typedef std::reverse_iterator<const_iterator> const_reverse_iterator;
    const const_iterator& vdb_find_i64(uint64_t primary) const{
        // find in primary index (btree)
        // if 
      

        //  const item* ptr = itm.get();
        //  auto pk   = itm->primary_key();
        //  auto pitr = itm->__primary_itr;

        // auto c = primary_hashtree.find(primary);
        auto c = primary_hashtree.get(primary);
        
            // return *(new const_iterator(this, new btree_t<uint64_t,ipfsmultihash_t>::const_iterator(c)));
        if(c == NULL){
            return *(new const_iterator(this));
        }
        else {
            // auto itm = std::make_unique<item>( this, [&]( auto& i ) {
                T val;
                // get from ipfs (c)
                auto rawData = ipfs_svc_helper::getRawData(ipfsmultihash_to_uri(*c), false, false, _cleanup_delay);
                char * buffer = rawData.data();
                auto size = rawData.size();
                datastream<const char*> ds( (char*)buffer, uint32_t(size) );
                ds >> val;
            // });
            // const item* ptr = itm.get();
            return *(new const_iterator(this, new T(val)));
        }
    }
    void commit(){
        // auto root = primary_hashtree._root;
        // // serialize and save to ram
        // multiindex data;
        
        // if(multiindex_s.exists()){
        //     data = multiindex_s.get();
        // }
        // // data.rootNode = root._entry.pack();    
        // data.rootNode = root.pack();    
        // multiindex_s.set(data, name(current_receiver()));
    }
    void vdb_remove_i64(uint64_t key){
        // auto key = itr->primary_key();
        primary_hashtree.erase(key);
        commit();
    }
      
      

 public:
      multi_index( name code, uint64_t scope, uint32_t shards = 1024,uint32_t buckets_per_shard = 64, bool pin_shards = false, bool pin_buckets = false, uint32_t cleanup_delay = 0)
      :_code(code),_scope(scope),primary_hashtree(_scope, shards, buckets_per_shard, pin_shards, pin_buckets,cleanup_delay),_cleanup_delay(cleanup_delay)
      {                    
      }

      name get_code()const      { return _code; }
      const const_iterator cend()const   { return const_iterator( this ); }
      uint64_t get_scope()const { return _scope; }

      const_reverse_iterator crbegin()const { return std::make_reverse_iterator(cend()); }
      const_reverse_iterator rbegin()const  { return crbegin(); }
      const_iterator end()const    { return cend(); }

      uint64_t available_primary_key()const {
          vconfig_sgt vconfigsgt(_code,name(TableName).value);
          auto config = vconfigsgt.get_or_default();       
          return config.next_available_key;
      }

      template<typename Lambda>
      const_iterator emplace( name payer, Lambda&& constructor ) {
         using namespace _multi_index_detail;

         eosio::check( _code == current_receiver(), "cannot create objects in table of another contract" ); // Quick fix for mutating db using multi_index that shouldn't allow mutation. Real fix can come in RC2.
            
            T obj = T();
            constructor( obj );

            auto buffer = eosio::pack(obj);

            auto pk = obj.primary_key();

            //populate/update the config singleton
            vconfig_sgt vconfigsgt(_code,name(TableName).value);
            auto config = vconfigsgt.get_or_default();
            if(config.next_available_key < pk + 1) //dont decrease next_available_key
                config.next_available_key = pk + 1; //increment the key
            if(config.shards == 0 && config.buckets_per_shard == 0) {
                //config is not yet set
                config.shards = primary_hashtree.get_shards();
                config.buckets_per_shard = primary_hashtree.get_buckets();
            } else {
                //confirm correctly intitialized
                eosio::check(config.shards == primary_hashtree.get_shards(), "cannot initialize multi-index with different number of shards");
                eosio::check(config.buckets_per_shard == primary_hashtree.get_buckets(), "cannot initialize multi-index with different number of buckets per shard");
            }            
            vconfigsgt.set(config,_code);
            
            

            auto uri = ipfs_svc_helper::setRawData(buffer, false, _cleanup_delay);
            auto multihash = uri_to_ipfsmultihash(uri);
            
            primary_hashtree.add(pk, multihash, payer);
         commit();
         return const_iterator(this, nullptr);
      }
      template<typename Lambda>
      void modify( const_iterator itr, name payer, Lambda&& updater ) {
         eosio::check( itr != end(), "cannot pass end iterator to modify" );

         modify( *itr, payer, std::forward<Lambda&&>(updater) );
      }


      template<typename Lambda>
      void modify( const T& obj, name payer, Lambda&& updater ) {
         using namespace _multi_index_detail;

         eosio::check( _code == current_receiver(), "cannot modify objects in table of another contract" ); // Quick fix for mutating db using multi_index that shouldn't allow mutation. Real fix can come in RC2.
         auto pk = obj.primary_key();

         auto& mutableobj = const_cast<T&>(obj); // Do not forget the auto& otherwise it would make a copy and thus not update at all.
         updater( mutableobj );

         eosio::check( pk == obj.primary_key(), "updater cannot change primary key when modifying an object" );
         
         auto buffer = eosio::pack(obj);
         auto uri = ipfs_svc_helper::setRawData(buffer, false, _cleanup_delay);
         auto multihash = uri_to_ipfsmultihash(uri);
        
         primary_hashtree.set(pk, multihash, payer);
         commit();
      }
      const T& get( uint64_t primary, const char* error_msg = "unable to find key" )const {
         auto result = find( primary );
         eosio::check( result != cend(), error_msg );
         return *result;
      }
      const_iterator find( uint64_t primary )const {
         auto itr = vdb_find_i64(primary);
         return itr;
      }
      const_iterator require_find( uint64_t primary, const char* error_msg = "unable to find key" )const {
         auto itr = vdb_find_i64(primary);
         return itr;
      }

      const_iterator erase( const_iterator itr ) {
         eosio::check( itr != end(), "cannot pass end iterator to erase" );

         const auto& obj = *itr;
         ++itr;

         erase(obj);

         return itr;
      }

      void erase( const T& obj ) {
         using namespace _multi_index_detail;
         auto pk = obj.primary_key();
         vdb_remove_i64( pk );
      }    
};
}