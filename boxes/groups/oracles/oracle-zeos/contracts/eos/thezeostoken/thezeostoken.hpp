#pragma once
#define THEZEOSTOKEN_HEADER_FILE

// comment out to use EOS RAM for merkle tree, tx data and nullifier tables, uncomment to use VRAM
//#define USE_VRAM

// VRAM and LiquidOracle includes
#define USE_ADVANCED_IPFS
#include <eosio/eosio.hpp>
#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"
#include "../dappservices/oracle.hpp"
#include "../../../../zeosio/include/zeosio.hpp"
#include <optional>
#include <map>
using namespace zeosio::halo2;
using namespace eosio;
using namespace std;

#define DAPPSERVICES_ACTIONS() \
    XSIGNAL_DAPPSERVICE_ACTION \
    IPFS_DAPPSERVICE_ACTIONS \
    ORACLE_DAPPSERVICE_ACTIONS

#define DAPPSERVICE_ACTIONS_COMMANDS() \
    IPFS_SVC_COMMANDS() \
    ORACLE_SVC_COMMANDS()

#define G_ROOTS_FIFO_SIZE 32

#define MT_ARR_LEAF_ROW_OFFSET(d) ((1ULL<<(d)) - 1)
#define MT_ARR_FULL_TREE_OFFSET(d) ((1ULL<<((d)+1)) - 1)
#define MT_NUM_LEAVES(d) (1ULL<<(d))

// equivalent to TransmittedNoteCiphertext of note.rs (zeos-orchard)
struct TransmittedNoteCiphertext
{
    // The serialization of the ephemeral public key
    string epk_bytes; //[u8; 32],
    // The encrypted note ciphertext
    string enc_ciphertext; //[u8; ENC_CIPHERTEXT_SIZE],
    // An encrypted value that allows the holder of the outgoing cipher
    // key for the note to recover the note plaintext.
    string out_ciphertext; //[u8; 80],

    EOSLIB_SERIALIZE(TransmittedNoteCiphertext, (epk_bytes)(enc_ciphertext)(out_ciphertext))
};

#define CONTRACT_NAME() thezeostoken

// This version of eosio::get_action doesn't abort when index is out of range.
// Thanks Todd Fleming! https://eoscommunity.github.io/clsdk-docs/book/std/cpay/index.html
optional<action> better_get_action(uint32_t type, uint32_t index)
{
    auto size = internal_use_do_not_use::get_action(type, index, nullptr, 0);
    if(size < 0)
        return nullopt;
    vector<char> raw(size);
    auto size2 = internal_use_do_not_use::get_action(type, index, raw.data(), size);
    check(size2 == size, "get_action failed");
    return unpack<action>(raw.data(), size);
}

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

    // List of all transmitted notes in encrypted form.
    // equivalent to TransmittedNoteCiphertextEx of contract.rs (zeos-orchard)
    TABLE TransmittedNoteCiphertextEx
    {
        uint64_t id;
        uint64_t block_number;
        TransmittedNoteCiphertext encrypted_note;
        
        uint64_t primary_key() const { return id; }
    };
#ifdef USE_VRAM
    typedef dapp::advanced_multi_index<"notes"_n, TransmittedNoteCiphertextEx, uint64_t> en_t;
    typedef eosio::multi_index<".notes"_n, TransmittedNoteCiphertextEx> encrypted_notes_t_v_abi;
    typedef eosio::multi_index<"notes"_n, shardbucket> encrypted_notes_t_abi;
#else
    typedef eosio::multi_index<"noteseosram"_n, TransmittedNoteCiphertextEx> en_t;
#endif

    // zeos note commitments merkle tree table
    TABLE merkle_node
    {
        uint64_t idx;
        checksum256 val;

        uint64_t primary_key() const { return idx; }
        checksum256 by_value() const { return val; }
    };
#ifdef USE_VRAM
    typedef dapp::advanced_multi_index<"mt"_n, merkle_node, uint64_t, indexed_by<"byval"_n, const_mem_fun<merkle_node, checksum256, &merkle_node::by_value>>> mt_t;
    typedef eosio::multi_index<".mt"_n, merkle_node> mt_t_v_abi;
    typedef eosio::multi_index<"mt"_n, shardbucket> mt_t_abi;
#else
    typedef eosio::multi_index<"mteosram"_n, merkle_node, indexed_by<"byval"_n, const_mem_fun<merkle_node, checksum256, &merkle_node::by_value>>> mt_t;
#endif

    // nullifier table
    TABLE nullifier
    {
        checksum256 val;

        // use the lower 64 bits of the hash as primary key since collisions are very unlikely
        uint64_t primary_key() const { return *reinterpret_cast<uint64_t*>(val.extract_as_byte_array().data()); }
    };
    typedef eosio::multi_index<"nullifiers"_n, nullifier> nf_t;

    // roots table
    TABLE root
    {
        checksum256 val;

        // use the lower 64 bits of the hash as primary key since collisions are very unlikely
        uint64_t primary_key() const { return *reinterpret_cast<uint64_t*>(val.extract_as_byte_array().data()); }
    };
    typedef eosio::multi_index<"roots"_n, root> rt_t;

    // buffers an entire tx for the time of execution
    TABLE txbuffer
    {
        size_t cur;
        size_t last;
        vector<action> tx;
    };
    using txb_t = singleton<"txbuffer"_n, txbuffer>;
    txb_t txb;

    // buffers a set of assets for (batch) minting
    TABLE assetbuffer
    {
        list<extended_asset> assets;
    };
    using assetb_t = singleton<"assetbuffer"_n, assetbuffer>;
    assetb_t ab;

    TABLE global
    {
        uint64_t note_count;        // number of encrypted notes
        uint64_t leaf_count;        // number of merkle tree leaves
        uint64_t tree_depth;        // merkle tree depth
        checksum256 tree_root;      // current merkle tree root
    };
    using g_t = singleton<"global"_n, global>;
    g_t global;

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
    
    void sub_balance(
        const name& owner,
        const asset& value
    );
    
    void add_balance(
        const name& owner,
        const asset& value,
        const name& ram_payer
    );
    
    checksum256 update_merkle_tree(
        const checksum256& tree_root,
        const uint64_t& leaf_count,
        const uint64_t& tree_depth,
        const vector<const uint8_t*>& leaves
    );

    bool is_root_valid(
        const checksum256& root
    );

    public:

    thezeostoken(
        name self,
        name code, 
        datastream<const char *> ds
    );

    // set verifier key
    ACTION setvk(
        const name& code,
        const name& id,
        const string& vk
    );

    // verify proof
    ACTION verifyproof(
        const string& type,
        const name& code,
        const name& id,
        const string& proof,
        const string& inputs
    );

    // execute transaction
    ACTION begin(
        const string& proof,
        vector<action>& tx,
        const vector<TransmittedNoteCiphertext>& notes
    );
    ACTION step();
    ACTION exec(
        const vector<zaction>& ztx
    );
    ACTION testmtupdate(
        const uint64_t& num
    );
    ACTION testaddnote(
        const vector<TransmittedNoteCiphertext>& notes
    );
    void ontransfer(
        name from,
        name to,
        asset quantity,
        string memo
    );

    // init
    ACTION init(
        const uint64_t& tree_depth
    );

    // token contract actions
    ACTION create(
        const name& issuer,
        const asset& maximum_supply
    );

    ACTION issue(
        const name& to,
        const asset& quantity,
        const string& memo
    );
    
    ACTION retire(
        const asset& quantity,
        const string& memo
    );

    ACTION transfer(
        const name& from,
        const name& to,
        const asset& quantity,
        const string& memo
    );

    ACTION open(
        const name& owner,
        const symbol& symbol,
        const name& ram_payer
    );

    ACTION close(
        const name& owner,
        const symbol& symbol
    );

    inline asset get_supply(
        const symbol_code& sym
    ) const;
    
    inline asset get_balance(
        const name& owner,
        const symbol_code& sym
    ) const;
    
//CONTRACT_END((setvk)(verifyproof)(begin)(step)(exec)(testmtupdate)(testaddnote)(init)(create)(issue)(retire)(transfer)(open)(close)(xdcommit))

};

extern "C"
{
    void apply(uint64_t receiver, uint64_t code, uint64_t action)
    {
        if(receiver == name("thezeostoken").value && action == name("transfer").value)
        {
            execute_action(name(receiver), name(code), &CONTRACT_NAME()::ontransfer);
        }
        else
        {
            switch(action)
            {
                EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), DAPPSERVICE_ACTIONS_COMMANDS())
                EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (setvk)(verifyproof)(begin)(step)(exec)(testmtupdate)(testaddnote)(init)(create)(issue)(retire)(transfer)(open)(close))
                EOSIO_DISPATCH_HELPER(CONTRACT_NAME(), (xsignal))
            }
        }
        eosio_exit(0);
    }
}