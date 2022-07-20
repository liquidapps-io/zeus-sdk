#include "thezeostoken.hpp"

thezeostoken::thezeostoken(name self, name code, datastream<const char *> ds) :
    contract(self, code, ds)
{
}

void thezeostoken::setvk(const name& code, const name& id, const vector<uint8_t>& vk)
{
    require_auth(code);
    
    vk_t vks(get_self(), code.value);
    auto c = vks.find(id.value);
    
    if(c == vks.end())
    {
        // add new key
        vks.emplace(code, [&](auto& row){
            row.id = id;
            row.vk = vk;
        });
    }
    else
    {
        if(vk.empty())
        {
            // erase existing key to free up RAM
            vks.erase(c);
        }
        else
        {
            // update existing key
            vks.modify(c, code, [&](auto& row){
                row.vk = vk;
            });
        }
    }
}

void thezeostoken::verifyproof(const string& type, const name& code, const name& id, const string& proof, const string& inputs)
{
    /* TODO: this check should not be commented out! I only did this because of a DAPP error caused by the transfer key for whatever reason
    PROBABLY BECAUSE OF NOT ENOUGH RAM TO LOAD THE KEY FROM VRAM TO EOS RAM???
    vk_t vks(get_self(), code.value);
    auto c = vks.find(id.value);
    check(c != vks.end(), "vk id doesn't exist");
    */
    string str = "zeos_verify_proof://";
    str.append(type);
    str.append("/");
    str.append(code.to_string());
    str.append("/");
    str.append(id.to_string());
    str.append("/");
    str.append(proof);
    str.append("/");
    str.append(inputs);

    //uint32_t dsp_count = 0;
    bool valid = getURI(vector<char>(str.begin(), str.end()), [&](auto& results) { 
        uint32_t dsp_threshold = 1;
        // ensure the specified amount of DSPs have responded before a response is accepted
        check(results.size() >= dsp_threshold, "require multiple results for consensus");
        //dsp_count = results.size();
        auto itr = results.begin();
        auto first = itr->result;
        ++itr;
        while(itr != results.end())
        {
            check(itr->result == first, "consensus failed");
            ++itr;
        }
        return first;
    })[0] == '1';
    
    check(valid, "proof invalid");
    //print("Proof verified by ", dsp_count, " DSPs\n\r");
}

void thezeostoken::init(const uint64_t& depth)
{
    require_auth(_self);

    // empty all tables (txd, mt, nf)
    txd_t txd(_self, _self.value);
    for(auto it = txd.begin(); it != txd.end(); )
        it = txd.erase(it);
    mt_t mt(_self, _self.value);
    for(auto it = mt.begin(); it != mt.end(); )
        it = mt.erase(it);
    nf_t nf(_self, _self.value);
    for(auto it = nf.begin(); it != nf.end(); )
        it = nf.erase(it);
    gs_t gs(_self, _self.value);
//    for(auto it = gs.begin(); it != gs.end(); )
//        it = gs.erase(it);
#ifdef USE_VRAM
    const uint64_t id = 0;
#else
    const uint64_t id = 1;
#endif
    // reset indices in global stats table
    auto stats = gs.find(id);
    if(stats == gs.end())
    {
        gs.emplace(_self, [&](auto& row){
            row.id = id;
            row.tx_count = 0;
            row.mt_leaf_count = 0;
            row.mt_depth = depth;
            row.mt_roots = deque<checksum256>();
        });
    }
    else
    {
        gs.modify(stats, _self, [&](auto& row){
            row.tx_count = 0;
            row.mt_leaf_count = 0;
            row.mt_depth = depth;
            row.mt_roots = deque<checksum256>();
        });
    }
}

// zMint
void thezeostoken::mint(const checksum256& epk_s,
                        const vector<uint128_t>& ciphertext_s,
                        const checksum256& epk_r,
                        const vector<uint128_t>& ciphertext_r,
                        const string& proof,
                        const asset& a,
                        const checksum256& z_a,
                        const name& user)
{
    require_auth(user);
    check(a.amount >= 0, "a.amount invalid");

    // pack inputs in same order as in the arithmetic circuit: amt_a, sym_a, z_a
    vector<bool> bits;
    append_bits(bits, a.amount);
    append_bits(bits, a.symbol.raw());
    append_bits(bits, z_a);
    string inputs = inputs_hexstr(compute_multipacking(bits));

    // verify proof
    verifyproof("groth16", _self, "zeosmintnote"_n, proof, inputs);

    // burn a from user's balance
    sub_balance(user, a);

    // add z_a to tree
    insert_into_merkle_tree(z_a, true);

    gs_t gs(_self, _self.value);
#ifdef USE_VRAM
    auto stats = gs.find(0);
#else
    auto stats = gs.find(1);
#endif
    check(stats != gs.end(), "global stats table not initialized");

    // add tx data
    add_txdata_to_list(TXD_MINT, stats->mt_leaf_count-1, epk_s, ciphertext_s, epk_r, ciphertext_r);
}

// zTransfer
void thezeostoken::ztransfer(const checksum256& epk_s,
                             const vector<uint128_t>& ciphertext_s,
                             const checksum256& epk_r,
                             const vector<uint128_t>& ciphertext_r,
                             const string& proof,
                             const checksum256& nf_a,
                             const checksum256& z_b,
                             const checksum256& z_c,
                             const checksum256& root)
{
    // pack inputs in same order as in the arithmetic circuit: nf_a, z_b, z_c, root
    vector<bool> bits;
    append_bits(bits, nf_a);
    append_bits(bits, z_b);
    append_bits(bits, z_c);
    append_bits(bits, root);
    string inputs = inputs_hexstr(compute_multipacking(bits));

    // check if root is valid
    check(is_root_valid(root), "root invalid");

    // check if nullifier already exists in list, if not add it
    nf_t nf(_self, _self.value);
#ifdef USE_VRAM
    auto it = nf.find(nf_a);
#else
    auto it = nf.find((uint64_t)*((uint32_t*)nf_a.extract_as_byte_array().data()));
#endif
    check(it == nf.end(), "nullifier exists => note has been spent already");
    nf.emplace(_self, [&](auto& n) {
        n.val = nf_a;
    });
    
    // verify proof
    verifyproof("groth16", _self, "transfernote"_n, proof, inputs);
    
    // add z_b and z_c to tree
    insert_into_merkle_tree(z_b, false);
    insert_into_merkle_tree(z_c, true);

    gs_t gs(_self, _self.value);
#ifdef USE_VRAM
    auto stats = gs.find(0);
#else
    auto stats = gs.find(1);
#endif
    check(stats != gs.end(), "global stats table not initialized");

    // add tx data
    add_txdata_to_list(TXD_ZTRANSFER, stats->mt_leaf_count-2, epk_s, ciphertext_s, epk_r, ciphertext_r);
}

// zBurn
void thezeostoken::burn(const checksum256& epk_s,
                        const vector<uint128_t>& ciphertext_s,
                        const checksum256& epk_r,
                        const vector<uint128_t>& ciphertext_r,
                        const string& proof,
                        const checksum256& nf_a,
                        const asset& b,
                        const checksum256& z_c,
                        const checksum256& root,
                        const name& user)
{
    // NOTE: uncomment if users should only be able to withdraw to their own EOS account, not to someone else's
    //require_auth(user);

    // pack inputs in same order as in the arithmetic circuit: nf_a, amt_b, sym_b, z_c, root
    vector<bool> bits;
    append_bits(bits, nf_a);
    append_bits(bits, b.amount);
    append_bits(bits, b.symbol.raw());
    append_bits(bits, z_c);
    append_bits(bits, root);
    string inputs = inputs_hexstr(compute_multipacking(bits));

    // check if root is valid
    check(is_root_valid(root), "root invalid");

    // check if nullifier already exists in list, if not add it
    nf_t nf(_self, _self.value);
#ifdef USE_VRAM
    auto it = nf.find(nf_a);
#else
    auto it = nf.find((uint64_t)*((uint32_t*)nf_a.extract_as_byte_array().data()));
#endif
    check(it ==  nf.end(), "nullifier exists => note has been spent already");
    nf.emplace(_self, [&](auto& n) {
        n.val = nf_a;
    });

    // verify proof
    verifyproof("groth16", _self, "zeosburnnote"_n, proof, inputs);
    
    // add z_c to tree
    insert_into_merkle_tree(z_c, true);

    // mint b to user's balance
    add_balance(user, b, user);

    gs_t gs(_self, _self.value);
#ifdef USE_VRAM
    auto stats = gs.find(0);
#else
    auto stats = gs.find(1);
#endif
    check(stats != gs.end(), "global stats table not initialized");

    // add tx data
    add_txdata_to_list(TXD_BURN, stats->mt_leaf_count-1, epk_s, ciphertext_s, epk_r, ciphertext_r);
}

void thezeostoken::create(const name& issuer, const asset& maximum_supply)
{
    require_auth(_self);

    auto sym = maximum_supply.symbol;
    check(sym.is_valid(), "invalid symbol name");
    check(maximum_supply.is_valid(), "invalid supply");
    check(maximum_supply.amount > 0, "max-supply must be positive");

    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    check(existing == statstable.end(), "token with symbol already exists");

    statstable.emplace(_self, [&](auto& s) {
       s.supply.symbol = maximum_supply.symbol;
       s.max_supply    = maximum_supply;
       s.issuer        = issuer;
    });
}

void thezeostoken::issue(const name& to, const asset& quantity, const string& memo)
{
    auto sym = quantity.symbol;
    check(sym.is_valid(), "invalid symbol name");
    check(memo.size() <= 256, "memo has more than 256 bytes");

    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    check(existing != statstable.end(), "token with symbol does not exist, create token before issue");
    const auto& st = *existing;

// TODO: ALWAYS CHECK IF THE FAUCET IS TURNED OFF!
//check(quantity.amount <= 1000000, "only 100 ZEOS tokens are allowed per faucet issue");
    require_auth(st.issuer);
    check(quantity.is_valid(), "invalid quantity");
    check(quantity.amount > 0, "must issue positive quantity");

    check(quantity.symbol == st.supply.symbol, "symbol precision mismatch");
    check(quantity.amount <= st.max_supply.amount - st.supply.amount, "quantity exceeds available supply");

    statstable.modify(st, same_payer, [&](auto& s) {
       s.supply += quantity;
    });

    add_balance(st.issuer, quantity, st.issuer);

    if(to != st.issuer) {
       SEND_INLINE_ACTION(*this, transfer, {st.issuer,"active"_n}, {st.issuer, to, quantity, memo});
    }
}

void thezeostoken::retire(const asset& quantity, const string& memo)
{
    auto sym = quantity.symbol;
    check(sym.is_valid(), "invalid symbol name");
    check(memo.size() <= 256, "memo has more than 256 bytes");

    stats statstable(_self, sym.code().raw());
    auto existing = statstable.find(sym.code().raw());
    check(existing != statstable.end(), "token with symbol does not exist");
    const auto& st = *existing;

    require_auth(st.issuer);
    check(quantity.is_valid(), "invalid quantity");
    check(quantity.amount > 0, "must retire positive quantity");

    check(quantity.symbol == st.supply.symbol, "symbol precision mismatch");

    statstable.modify(st, same_payer, [&](auto& s) {
        s.supply -= quantity;
    });

    sub_balance(st.issuer, quantity);
}

void thezeostoken::transfer(const name& from, const name& to, const asset& quantity, const string& memo)
{
    check(from != to, "cannot transfer to self");
    require_auth(from);
    check(is_account(to), "to account does not exist");
    auto sym = quantity.symbol.code().raw();
    stats statstable(_self, sym);
    const auto& st = statstable.get(sym);

    require_recipient(from);
    require_recipient(to);

    check(quantity.is_valid(), "invalid quantity");
    check(quantity.amount > 0, "must transfer positive quantity");
    check(quantity.symbol == st.supply.symbol, "symbol precision mismatch");
    check(memo.size() <= 256, "memo has more than 256 bytes");

    sub_balance(from, quantity);
    add_balance(to, quantity, from);
}

void thezeostoken::open(const name& owner, const symbol& symbol, const name& ram_payer)
{
    require_auth(ram_payer);

    check(is_account(owner), "owner account does not exist");

    auto sym_code_raw = symbol.code().raw();
    stats statstable(get_self(), sym_code_raw);
    const auto& st = statstable.get(sym_code_raw, "symbol does not exist");
    check(st.supply.symbol == symbol, "symbol precision mismatch");

    accounts acnts(get_self(), owner.value);
    auto it = acnts.find(sym_code_raw);
    if(it == acnts.end()) {
        acnts.emplace(ram_payer, [&](auto& a){
            a.balance = asset{0, symbol};
        });
    }
}

void thezeostoken::close(const name& owner, const symbol& symbol)
{
    require_auth(owner);
    accounts acnts(get_self(), owner.value);
    auto it = acnts.find(symbol.code().raw());
    check(it != acnts.end(), "Balance row already deleted or never existed. Action won't have any effect.");
    check(it->balance.amount == 0, "Cannot close because the balance is not zero.");
    acnts.erase(it);
}

void thezeostoken::add_balance(const name& owner, const asset& value, const name& ram_payer)
{
    accounts to_acnts(_self, owner.value);
    auto to = to_acnts.find(value.symbol.code().raw());
    if(to == to_acnts.end()) {
        to_acnts.emplace(ram_payer, [&](auto& a){
            a.balance = value;
        });
    } else {
        to_acnts.modify(to, same_payer, [&](auto& a) {
            a.balance += value;
        });
    }
}

void thezeostoken::sub_balance(const name& owner, const asset& value)
{
    accounts from_acnts(_self, owner.value);
    const auto& from = from_acnts.get(value.symbol.code().raw(), "no balance object found");
    check(from.balance.amount >= value.amount, "overdrawn balance");
    if(from.balance.amount == value.amount) {
        from_acnts.erase(from);
    } else {
        from_acnts.modify(from, same_payer, [&](auto& a) {
            a.balance -= value;
        });
    }
}

asset thezeostoken::get_supply(const symbol_code& sym) const
{
    stats statstable(_self, sym.raw());
    const auto& st = statstable.get(sym.raw());
    return st.supply;
}

asset thezeostoken::get_balance(const name& owner, const symbol_code& sym) const
{
    accounts accountstable(_self, owner.value);
    const auto& ac = accountstable.get(sym.raw());
    return ac.balance;
}

// merkle tree structure:
// 
//              (0)                 [d = 0] (root)
//         /            \
//       (1)            (2)         [d = 1]
//     /    \        /      \
//   (3)    (4)    (5)      (6)     [d = 2]
//   / \    / \    /  \    /  \
// (7) (8)(9)(10)(11)(12)(13)(14)   [d = 3]
//
#define MT_ARR_LEAF_ROW_OFFSET(d) ((1<<(d)) - 1)
#define MT_ARR_FULL_TREE_OFFSET(d) ((1<<((d)+1)) - 1)
#define MT_NUM_LEAVES(d) (1<<(d))
#define GS_ROOTS_FIFO_SIZE 32
void thezeostoken::insert_into_merkle_tree(const checksum256& val, const bool& add_root_to_list)
{
    // fetch global stats
    gs_t gs(_self, _self.value);
#ifdef USE_VRAM
    auto stats = gs.find(0);
#else
    auto stats = gs.find(1);
#endif
    check(stats != gs.end(), "global stats table not initialized");

    // calculate array index of next free leaf in >local< tree
    uint64_t idx = MT_ARR_LEAF_ROW_OFFSET(stats->mt_depth) + stats->mt_leaf_count % MT_NUM_LEAVES(stats->mt_depth);
    // calculate tree offset to translate array indices of >local< tree to global array indices
    uint64_t tos = stats->mt_leaf_count / MT_NUM_LEAVES(stats->mt_depth) /*=tree_idx*/ * MT_ARR_FULL_TREE_OFFSET(stats->mt_depth);

    // insert val into leaf
    mt_t tree(_self, _self.value);
    tree.emplace(_self, [&](auto& leaf) {
        leaf.idx = tos + idx;
        leaf.val = val;
    });

    // calculate merkle path up to root
    for(int d = stats->mt_depth; d > 0; d--)
    {
        // if array index of node is uneven it is always the left child
        bool is_left_child = 1 == idx % 2;

        // determine sister node
        uint64_t sis_idx = is_left_child ? idx + 1 : idx - 1;

        // get values of both nodes
        //                                     (n)              |            (n)
        //                                   /     \            |         /      \
        //                                (idx)     (0)         |     (sis_idx)  (idx)
        checksum256 l = is_left_child ? tree.get(tos + idx).val : tree.get(tos + sis_idx).val;
        checksum256 r = is_left_child ? checksum256() /* =0 */  : tree.get(tos + idx).val;

        // concatenate and digest
        uint8_t digest[32];
        Blake2sContext context;
        blake2sInit(&context, NULL, 0, 32);
        blake2sUpdate(&context, l.extract_as_byte_array().data(), 32);
        blake2sUpdate(&context, r.extract_as_byte_array().data(), 32);
        blake2sFinal(&context, digest);
        checksum256 parent_val = checksum256(digest);

        // set idx to parent node index:
        // left child's array index divided by two (integer division) equals array index of parent node
        idx = is_left_child ? idx / 2 : sis_idx / 2;

        // check if parent node was already created
        auto it = tree.find(tos + idx);
        // write new parent
        if(it == tree.end())
        {
            tree.emplace(_self, [&](auto& node) {
                node.idx = tos + idx;
                node.val = parent_val;
            });
        }
        else
        {
            tree.modify(it, _self, [&](auto& node) {
                node.val = parent_val;
            });
        }
    }
    
    // update global stats: increment leaf index, add new root to FIFO
    gs.modify(stats, _self, [&](auto& row) {
        row.mt_leaf_count++;
        if(add_root_to_list)
        {
            row.mt_roots.push_front(tree.get(tos).val);
            // only memorize the most recent x number of root nodes
            if(row.mt_roots.size() > GS_ROOTS_FIFO_SIZE)
            {
                row.mt_roots.pop_back();
            }
        }
    });
}

bool thezeostoken::is_root_valid(const checksum256& root)
{
    // a root is valid if it is the root of an existing full merkle tree OR in the queue
    // of the most recent roots of the current merkle tree
    
    // check if root is in deque of most recent roots
    gs_t gs(_self, _self.value);
#ifdef USE_VRAM
    auto stats = gs.find(0);
#else
    auto stats = gs.find(1);
#endif
    check(stats != gs.end(), "global stats table not initialized");

    for(auto r = stats->mt_roots.begin(); r != stats->mt_roots.end(); ++r)
    {
        if(*r == root)
        {
            return true;
        }
    }
    
    // check roots of previous, full merkle trees (tree_index > 0)
    uint64_t tree_idx = stats->mt_leaf_count / MT_NUM_LEAVES(stats->mt_depth);

    mt_t tree(_self, _self.value);
    for(uint64_t t = 0; t < tree_idx; ++t)
    {
        // can use get here because root must exist if this tree has a leaf
        auto it = tree.get(t * MT_ARR_FULL_TREE_OFFSET(stats->mt_depth));
        
        if(it.val == root)
        {
            return true;
        }
    }
    
    // root was not found
    return false;
}

void thezeostoken::add_txdata_to_list(const uint8_t& type,
                                      const uint64_t& mt_leaf_count,
                                      const checksum256& epk_s,
                                      const vector<uint128_t>& ciphertext_s,
                                      const checksum256& epk_r,
                                      const vector<uint128_t>& ciphertext_r)
{
    gs_t gs(_self, _self.value);
    txd_t txd(_self, _self.value);
#ifdef USE_VRAM
    auto stats = gs.find(0);
#else
    auto stats = gs.find(1);
#endif
    check(stats != gs.end(), "global stats table not initialized");
    txd.emplace(_self, [&](auto& tx) {
        tx.id = stats->tx_count;
        tx.type = type;
        tx.mt_leaf_count = mt_leaf_count;
        tx.epk_s = epk_s;
        tx.ciphertext_s = ciphertext_s;
        tx.epk_r = epk_r;
        tx.ciphertext_r = ciphertext_r;
    });
    gs.modify(stats, _self, [&](auto& row) {
        row.tx_count++;
    });
}
