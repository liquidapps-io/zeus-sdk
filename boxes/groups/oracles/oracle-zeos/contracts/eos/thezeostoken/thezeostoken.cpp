#include "thezeostoken.hpp"

thezeostoken::thezeostoken(name self, name code, datastream<const char *> ds) :
    contract(self, code, ds),
    global(_self, _self.value)
{
}

void thezeostoken::setvk(const name& code, const name& id, const string& vk)
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
    vk_t vks(get_self(), code.value);
    auto c = vks.find(id.value);
    check(c != vks.end(), "vk id doesn't exist");

    string str = "zeos_verify_proof://";
    str.append(type);
    str.append("/");
    str.append(c->vk);
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

void thezeostoken::update_merkle_tree(const uint64_t& leaf_count, const uint64_t& tree_depth, const vector<checksum256>& leaves)
{
    // build uri string by concatening all input parameters for the vcpu handler
    string str = "zeos_merkle_tree_updater://";
    str.append(to_string(leaf_count));
    str.append("/");
    str.append(to_string(tree_depth));
    str.append("/");
    for(auto it = leaves.begin(); it != leaves.end(); ++it)
    {
        str.append(byte2str<32>(reinterpret_cast<const uint8_t*>(it->extract_as_byte_array().data())));
    }

    //uint32_t dsp_count = 0;
    vector<char> res = getURI(vector<char>(str.begin(), str.end()), [&](auto& results) { 
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
    });

    // modify/insert nodes (40 bytes each) into tree
    mt_t tree(_self, _self.value);
    check(res.size() % 40 == 0, "Node list must be multiple of 40 bytes: 8 bytes 'index', 32 bytes 'value'");
    for(int i = 0; i < res.size()/40; i++)
    {
        uint64_t* idx_ptr = reinterpret_cast<uint64_t*>(&res[i*40]);
        // the following might look like a dirty hack to some but it saves us one memcpy and should be safe according
        // to the STL (https://stackoverflow.com/questions/11205186/treat-c-cstyle-array-as-stdarray)
        checksum256 val = *reinterpret_cast<array<uint8_t, 32>*>(&res[i*40 + 8]);

        // MSB of idx determines if node exists or is new
        if(*idx_ptr & 0x8000000000000000)
        {
            auto it = tree.find(*idx_ptr & 0x7FFFFFFFFFFFFFFF);
            tree.modify(it, _self, [&](auto& row) {
                row.val = val;
            });
        }
        else
        {
            tree.emplace(_self, [&](auto& row) {
                row.idx = *idx_ptr;
                row.val = val;
            });
        }
    }
}
void thezeostoken::testmtupdate(const uint64_t& num)
{
    // create vector with <num> empty leaves
    checksum256 nc = array<uint8_t, 32>{249, 255, 255, 255, 132, 169, 195, 207, 62, 48, 229, 190, 27, 209, 17, 16, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 63};
    vector<checksum256> v;
    for(int i = 0; i < num; i++)
        v.push_back(nc);
    // fetch global stats, add leaves, and update global stats
    auto g = global.get();
    update_merkle_tree(g.mt_leaf_count, g.mt_depth, v);
    global.set({0, g.mt_leaf_count + num, g.mt_depth, deque<checksum256>()}, _self);
}

void thezeostoken::init(const uint64_t& tree_depth)
{
    require_auth(_self);

    // reset global state
    global.set({0, 0, tree_depth, deque<checksum256>()}, _self);
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

