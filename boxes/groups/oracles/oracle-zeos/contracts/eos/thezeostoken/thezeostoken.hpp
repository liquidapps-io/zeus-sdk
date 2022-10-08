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

    // zeos private transaction data table
    TABLE transaction_data
    {
        uint64_t id;
        uint8_t type;
        uint64_t mt_leaf_count;
        checksum256 epk_s;
        vector<uint128_t> ciphertext_s;
        checksum256 epk_r;
        vector<uint128_t> ciphertext_r;
        
        uint64_t primary_key() const { return id; }
    };
#ifdef USE_VRAM
    typedef dapp::advanced_multi_index<"txd"_n, transaction_data, uint64_t> txd_t;
    typedef eosio::multi_index<".txd"_n, transaction_data> txd_t_v_abi;
    typedef eosio::multi_index<"txd"_n, shardbucket> txd_t_abi;
#else
    typedef eosio::multi_index<"txdeosram"_n, transaction_data> txd_t;
#endif

    // zeos note commitments merkle tree table
    TABLE merkle_tree
    {
        uint64_t idx;
        checksum256 val;

        uint64_t primary_key() const { return idx; }
    };
#ifdef USE_VRAM
    typedef dapp::advanced_multi_index<"mt"_n, merkle_tree, uint64_t> mt_t;
    typedef eosio::multi_index<".mt"_n, merkle_tree> mt_t_v_abi;
    typedef eosio::multi_index<"mt"_n, shardbucket> mt_t_abi;
#else
    typedef eosio::multi_index<"mteosram"_n, merkle_tree> mt_t;
#endif

    // zeos nullifier table
    TABLE nullifier
    {
        checksum256 val;
#ifdef USE_VRAM
        checksum256 primary_key() const { return val; }
    };
    typedef dapp::advanced_multi_index<"nf"_n, nullifier, checksum256> nf_t;
    typedef eosio::multi_index<".nf"_n, nullifier> nf_t_v_abi;
    typedef eosio::multi_index<"nf"_n, shardbucket> nf_t_abi;
#else
        // on eos just use the lower 64 bits of the hash as primary key since collisions are very unlikely
        uint64_t primary_key() const { return (uint64_t)*((uint32_t*)val.extract_as_byte_array().data()); }
    };
    typedef eosio::multi_index<"nfeosram"_n, nullifier> nf_t;
#endif

    TABLE global_stats
    {
        uint64_t id;                    // = 0 for vram, = 1 for eos ram
        uint64_t tx_count;              // number of private transactions
        uint64_t mt_leaf_count;         // number of merkle tree leaves
        uint64_t mt_depth;              // merkle tree depth
        deque<checksum256> mt_roots;    // stores the most recent roots defined by MTS_NUM_ROOTS. the current root is always the first element

        uint64_t primary_key() const { return id; }
    };
    typedef eosio::multi_index<"globalstats"_n, global_stats> gs_t;

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
    
    void insert_into_merkle_tree(const checksum256& val,
                                 const bool& add_root_to_list);
    
    bool is_root_valid(const checksum256& root);

    void add_txdata_to_list(const uint8_t& type,
                            const uint64_t& mt_leaf_count,
                            const checksum256& epk_s,
                            const vector<uint128_t>& ciphertext_s,
                            const checksum256& epk_r,
                            const vector<uint128_t>& ciphertext_r);

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
    ACTION init(const uint64_t& depth);

    // Mint
    ACTION mint(const checksum256& epk_s,
                const vector<uint128_t>& ciphertext_s,
                const checksum256& epk_r,
                const vector<uint128_t>& ciphertext_r,
                const string& proof,
                const asset& a,
                const checksum256& z_a,
                const name& user);

    // zTransfer
    ACTION ztransfer(const checksum256& epk_s,
                     const vector<uint128_t>& ciphertext_s,
                     const checksum256& epk_r,
                     const vector<uint128_t>& ciphertext_r,
                     const string& proof,
                     const checksum256& nf_a,
                     const checksum256& z_b,
                     const checksum256& z_c,
                     const checksum256& root);

    // Burn
    ACTION burn(const checksum256& epk_s,
                const vector<uint128_t>& ciphertext_s,
                const checksum256& epk_r,
                const vector<uint128_t>& ciphertext_r,
                const string& proof,
                const checksum256& nf_a,
                const asset& b,
                const checksum256& z_c,
                const checksum256& root,
                const name& user);

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
    
CONTRACT_END((setvk)(verifyproof)(init)(mint)(ztransfer)(burn)(create)(issue)(retire)(transfer)(open)(close)(xdcommit))