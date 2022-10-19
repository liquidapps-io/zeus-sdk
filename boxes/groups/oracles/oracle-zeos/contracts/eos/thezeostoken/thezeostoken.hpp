#pragma once

// comment out to use EOS RAM for merkle tree, tx data and nullifier tables, uncomment to use VRAM
//#define USE_VRAM

// VRAM and LiquidOracle includes
#define USE_ADVANCED_IPFS
#include <eosio/eosio.hpp>
#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"
#include "../dappservices/oracle.hpp"
#include "zeosio.hpp"

using namespace zeos::groth16;
using namespace eosio;
using namespace std;

#define DAPPSERVICES_ACTIONS() \
    XSIGNAL_DAPPSERVICE_ACTION \
    IPFS_DAPPSERVICE_ACTIONS \
    ORACLE_DAPPSERVICE_ACTIONS

#define DAPPSERVICE_ACTIONS_COMMANDS() \
    IPFS_SVC_COMMANDS() \
    ORACLE_SVC_COMMANDS()

#define TXD_MINT        1
#define TXD_ZTRANSFER   2
#define TXD_BURN        3

#define CONTRACT_NAME() thezeostoken

CONTRACT_START()
    
    // shardbucket table for dapp::multi_index
    TABLE shardbucket
    {
        vector<char> shard_uri;
        uint64_t shard;

        uint64_t primary_key() const { return shard; }
    };

    // verifier keys table
    TABLE vk
    {
        name id;
        string vk;

        uint64_t primary_key() const { return id.value; }
    };
    typedef eosio::multi_index<"vk"_n, vk> vk_t;

    // global state
    TABLE global
    {
        uint64_t note_count;            // number of encrypted notes
        uint64_t mt_leaf_count;         // number of merkle tree leaves
        uint64_t mt_depth;              // merkle tree depth
        deque<checksum256> mt_roots;    // stores the most recent roots defined by MTS_NUM_ROOTS. the current root is always the first element
    };
    using g_t = singleton<"global"_n, global>;
    g_t global;
    
    // zeos note commitments merkle tree table
    TABLE merkle_node
    {
        uint64_t idx;
        checksum256 val;

        uint64_t primary_key() const { return idx; }
    };
#ifdef USE_VRAM
    typedef dapp::advanced_multi_index<"mt"_n, merkle_node, uint64_t> mt_t;
    typedef eosio::multi_index<".mt"_n, merkle_node> mt_t_v_abi;
    typedef eosio::multi_index<"mt"_n, shardbucket> mt_t_abi;
#else
    typedef eosio::multi_index<"mteosram"_n, merkle_node> mt_t;
#endif

    // token contract tables
    TABLE account
    {
        asset balance;

        uint64_t primary_key() const { return balance.symbol.code().raw(); }
    };
    typedef eosio::multi_index<"accounts"_n, account> accounts;

    TABLE currency_stats
    {
        asset supply;
        asset max_supply;
        name issuer;

        uint64_t primary_key() const { return supply.symbol.code().raw(); }
    };
    typedef eosio::multi_index<"stat"_n, currency_stats> stats;
    
    void sub_balance(const name& owner,
                     const asset& value);
    
    void add_balance(const name& owner,
                     const asset& value,
                     const name& ram_payer);
    
    void update_merkle_tree(const uint64_t& leaf_count,
                            const uint64_t& tree_depth,
                            const vector<checksum256>& leaves);

    public:

    thezeostoken(name self,
                 name code, 
                 datastream<const char *> ds);

    // set verifier key
    ACTION setvk(const name& code,
                 const name& id,
                 const string& vk);

    // verify proof
    ACTION verifyproof(const string& type,
                       const name& code,
                       const name& id,
                       const string& proof,
                       const string& inputs);

    // init
    ACTION init(const uint64_t& tree_depth);
    
    ACTION testmtupdate(const uint64_t& num);
    
    // token contract actions
    ACTION create(const name& issuer,
                  const asset& maximum_supply);

    ACTION issue(const name& to,
                 const asset& quantity,
                 const string& memo);
    
    ACTION retire(const asset& quantity,
                  const string& memo);

    ACTION transfer(const name& from,
                    const name& to,
                    const asset& quantity,
                    const string& memo);

    ACTION open(const name& owner,
                const symbol& symbol,
                const name& ram_payer);

    ACTION close(const name& owner,
                 const symbol& symbol);

    inline asset get_supply(const symbol_code& sym) const;
    
    inline asset get_balance(const name& owner,
                             const symbol_code& sym) const;
    
CONTRACT_END((setvk)(verifyproof)(init)(testmtupdate)(create)(issue)(retire)(transfer)(open)(close)(xdcommit))