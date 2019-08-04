// This contract serves as an immutable decentralized storage
// backend for holding ethereum account nonces.

#include <eosio/eosio.hpp>

using namespace eosio;

class [[eosio::contract]] nonceholder : public contract {
    public:
        using contract::contract;

        [[eosio::action]]
        void updatenonce( uint64_t key, name owner, std::string address, uint64_t nonce) {
            require_auth(owner);

            nonce_table nonces( get_self(), get_first_receiver().value );
            auto iterator = nonces.find(key);

            if ( iterator == nonces.end() ) {
                nonces.emplace( owner, [&]( auto& row ) {
                    row.key = key;
                    row.owner = owner;
                    row.address = address;
                    row.nonce = nonce;
                });
            }
            // TODO: validate owner and address
            else {
                nonces.modify(iterator, owner, [&]( auto& row ) {
                    row.nonce = nonce;
                })
            }
        }

    private:
        struct [[eosio::table]] nonce {
            uint64_t key; // unique key, first n bits of some hash of address
            name owner;
            std::string address;
            uint256_t nonce;

            uint64_t primary_key() const { return key }
        }

        typedef eosio::multi_index<"nonces"_n, nonce> nonce_table;
}
