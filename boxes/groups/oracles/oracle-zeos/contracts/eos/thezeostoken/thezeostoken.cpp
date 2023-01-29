#include "thezeostoken.hpp"

thezeostoken::thezeostoken(
    name self,
    name code,
    datastream<const char *> ds
) :
    contract(self, code, ds),
    txb(_self, _self.value),
    ab(_self, _self.value),
    global(_self, _self.value)
{
}

void thezeostoken::setvk(
    const name& code,
    const name& id,
    const string& vk
)
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

void thezeostoken::verifyproof(
    const string& type,
    const name& code,
    const name& id,
    const string& proof,
    const string& inputs
)
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
    
    check(valid, "Proof invalid! Data: " + str);
    //print("Proof verified by ", dsp_count, " DSPs\n\r");
}

uint64_t dummy_mem[5] = {0xDEADBEEFDEADBEEF, 0xDEADBEEFDEADBEEF, 0xDEADBEEFDEADBEEF, 0xDEADBEEFDEADBEEF, 0xDEADBEEFDEADBEEF};
inline bool has_exec_zactions(
    const action* a
)
{
    return a->data.size() > (1 + sizeof(zaction::type) + ZI_SIZE + 1) &&    // ensure valid access for following checks 
           0 == memcmp(&a->data[1], dummy_mem, 40) &&                       // 5 times 0xDEADBEEFDEADBEEF check
           a->data[0] > 1 &&                                                // more zactions than just the dummy?
           a->data[1 + sizeof(zaction::type) + ZI_SIZE] == 0;               // memo field == ""?;
}

void thezeostoken::begin(
    const string& proof,
    vector<action>& tx,
    const vector<TransmittedNoteCiphertext>& notes
)
{
    check(global.exists(), "contract not initialized");
    auto stats = global.get();

    // check for context-free actions and other stuff
    auto action = better_get_action(0, 0);
    check(!action, "context-free actions are not allowed");
    check(tx.size() > 0, "transaction must contain at least one action");

    // make sure the action pattern (begin)(step)(step)... is given with as many steps as 'tx' requires
    // check out: https://eoscommunity.github.io/clsdk-docs/book/std/cpay/index.html
    int32_t begin_index = -1;
    int32_t last_step = -1;
    int32_t index = 0;
    for(;; ++index)
    {
        auto action = better_get_action(1, index);
        if(!action)
            break;
        if(action->account == "thezeostoken"_n && action->name == "begin"_n)
        {
            check(begin_index == -1, "only one 'begin' per transaction");
            begin_index = index;
            last_step = index + tx.size();
        }
        else if(begin_index >= 0 && index <= last_step)
        {
            check(action->account == "thezeostoken"_n && action->name == "step"_n, "1: not enough 'step' actions after 'begin'");
        }
    }
    check(index > last_step, "2: not enough 'step' actions after 'begin'");

    // collect public inputs for proof bundle verification and check for blacklisted transactions
    string inputs = "";
    vector<const uint8_t*> leaves;
    for(auto a = tx.begin(); a != tx.end(); ++a)
    {
        // blacklist all actions with pattern: *::transfer and eosio::*
        check(a->account != "eosio"_n, "system contract actions are blacklisted!");
        check(a->name != "transfer"_n, "'transfer' actions are blacklisted!");
        // TODO: any more accounts/actions that should be blacklisted?
        // TODO: change to whitelist of actions

        // in case of dummy_exec zaction collect public inputs (halo2 instances)
        if(has_exec_zactions(&(*a)))
        {
            char i = 1;
            char* ptr = a->data.data() + 1 + sizeof(zaction::type) + ZI_SIZE + 1 + sizeof(zaction::type);
            do
            {
                // see columns CMB and CMC of table: https://mschoenebeck.github.io/zeos-orchard/protocol/circuit.html#configurations
                switch(*reinterpret_cast<const uint64_t*>(ptr - sizeof(zaction::type)))
                {
                    case ZA_TRANSFERFT:
                    {   // CMB and CMC
                        leaves.push_back(reinterpret_cast<const uint8_t*>(ptr + ZI_SIZE - (32 + 32 + 8 + 8)));
                        leaves.push_back(reinterpret_cast<const uint8_t*>(ptr + ZI_SIZE - (32 + 8 + 8)));
                        inputs.append(byte2str<ZI_SIZE>(reinterpret_cast<const uint8_t*>(ptr)));
                        break;
                    }
                    case ZA_BURNFT:
                    {
                        // only CMC
                        leaves.push_back(reinterpret_cast<const uint8_t*>(ptr + ZI_SIZE - (32 + 8 + 8)));
                        inputs.append(byte2str<ZI_SIZE>(reinterpret_cast<const uint8_t*>(ptr)));
                        break;
                    }
                    case ZA_MINTFT:
                    case ZA_MINTNFT:
                    case ZA_BURNAUTH:
                    case ZA_TRANSFERNFT:
                    {
                        // only CMB
                        leaves.push_back(reinterpret_cast<const uint8_t*>(ptr + ZI_SIZE - (32 + 32 + 8 + 8)));
                        inputs.append(byte2str<ZI_SIZE>(reinterpret_cast<const uint8_t*>(ptr)));
                        break;
                    }
                    // only collect inputs (no leaves) for proof verification
                    case ZA_NULL:
                    {
                        inputs.append(byte2str<ZI_SIZE>(reinterpret_cast<const uint8_t*>(ptr)));
                        break;
                    }
                    // don't collect inputs if zaction type is ZA_MINTAUTH because it does not require a zero knowledge proof
                    case ZA_MINTAUTH:
                    case ZA_DUMMY:
                    default:
                    {
                        break;
                    }
                }

                ptr += ZI_SIZE;
                ptr += *reinterpret_cast<const uint8_t*>(ptr) + 1 + sizeof(zaction::type);
                ++i;
            }
            while(i < a->data[0]);

            // calculate the size of the entire vector<zactions> in bytes and write it into the dummy struct (lower 64 bit of field 'nf'). This will
            // make it easy to reduce the size of the 'data' vector of this particular EOSIO 'action' object to pass it as argument to 'exec' in 'step'
            // function.
            *reinterpret_cast<size_t*>(&a->data[1 + sizeof(zaction::type) + 32]) = ptr - sizeof(zaction::type) - a->data.data();
        }
    }

    // verify proof bundle if some public inputs have been found
    if(inputs.length() > 0)
    {
        verifyproof("zeos", "thezeostoken"_n, "zeosorchard1"_n, proof, inputs);
    }

    // add transmitted notes to list of encrypted notes
    if(notes.size() > 0)
    {
        // retrieve current block number
        uint64_t bn = static_cast<uint64_t>(current_block_number());
        en_t enc_notes(_self, _self.value);
        for(uint64_t i = 0; i < notes.size(); ++i)
        {
            check(notes[i].epk_bytes.length()      ==  32 * 2, "length of string 'epk_bytes' must equal 64");
            check(notes[i].enc_ciphertext.length() == 644 * 2, "length of string 'enc_ciphertext' must equal 1288");
            check(notes[i].out_ciphertext.length() ==  80 * 2, "length of string 'out_ciphertext' must equal 160");
            enc_notes.emplace(_self, [&](auto& row){
                row.id = stats.note_count + i;
                row.block_number = bn;
                row.encrypted_note = notes[i];
            });
        }
        // update global stats
        stats.note_count += notes.size();
    }

    check(notes.size() == leaves.size(), "Number of transmitted 'notes' must equal number of leaves extraced from transmitted zactions");

    // add new note commitments to merkle tree
    if(leaves.size() > 0)
    {
        stats.tree_root = update_merkle_tree(stats.tree_root, stats.leaf_count, stats.tree_depth, leaves);

        // update global stats
        stats.leaf_count += leaves.size();
    }

    // update global stats
    global.set(stats, _self);

    // copy tx into singleton buffer where it remains only during its execution. The last 'step' frees the buffer.
    txb.set({0, tx.size()-1, tx}, _self);
}

void thezeostoken::step()
{
    // execute the action (corresponding to the current 'step')
    auto b = txb.get();
    b.tx[b.cur].send();

    // if this action is not thezeostoken::exec execute its zactions (if any)
    if(!(b.tx[b.cur].name.value    == "exec"_n.value && 
         b.tx[b.cur].account.value == "thezeostoken"_n.value) &&
       has_exec_zactions(&b.tx[b.cur]))
    {
        // Transform current action into an 'exec' action. Call resize() on data to keep only the vector
        // of zactions for exec as first parameter and cut off all additional params.
        b.tx[b.cur].name = "exec"_n;
        b.tx[b.cur].account = "thezeostoken"_n;
        b.tx[b.cur].data.resize(*reinterpret_cast<const size_t*>(&b.tx[b.cur].data[1 + sizeof(zaction::type) + 32]));
        b.tx[b.cur].send();
    }

    // clear buffer or increase cur
    if(b.cur == b.last)
    {
        txb.remove();
    }
    else
    {
        b = txb.get();
        ++b.cur;
        txb.set(b, _self);
    }
}

void thezeostoken::exec(
    const vector<zaction>& ztx
)
{
    // this action should only be executable by thezeostoken itself and never by third party contracts!
    // executing the same zactions more than once per proof could be abused
    require_auth(_self);

    for(auto za = ztx.begin(); za != ztx.end(); ++za)
    {
        switch(za->type)
        {
            case ZA_DUMMY:
            case ZA_NULL:
            case ZA_MINTAUTH:
            default:
            {
                // no merkle tree/nf operations required
                break;
            }

            case ZA_MINTFT:
            {
                // TODO all the other checks for TRANSFERFT (ZEOS Book)
                check(ab.exists(), "ZA_MINTFT: deposit required before mint");
                auto l = ab.get().assets;
                auto asset = l.front();
                check(za->ins.b_d1 == asset.quantity.amount, "ZA_MINTFT: wrong amount. Expected: " + to_string(asset.quantity.amount) + " Provided: " + to_string(za->ins.b_d1));
                check(za->ins.b_d2 == asset.quantity.symbol.raw(), "ZA_MINTFT: wrong symbol. Expected: " + to_string(asset.quantity.symbol.raw()) + " Provided: " + to_string(za->ins.b_d2));
                check(za->ins.b_sc == asset.contract.value, "ZA_MINTFT: wrong contract. Expected: " + to_string(asset.contract.value) + " Provided: " + to_string(za->ins.b_sc));
                // clear buffer
                l.pop_front();
                if(l.empty())
                    ab.remove();
                break;
            }
            
            case ZA_MINTNFT:
            {
                // TODO
                break;
            }
            
            case ZA_TRANSFERFT:
            {
                // check if root is valid
                check(is_root_valid(za->ins.anchor), "ZA_TRANSFERFT: root invalid");
                // TODO all the other checks for TRANSFERFT (ZEOS Book)
                // check if nullifier already exists in list, if not add it
                nf_t nf(_self, _self.value);
                auto it = nf.find(*reinterpret_cast<uint64_t*>(za->ins.nf.extract_as_byte_array().data()));
                check(it == nf.end(), "ZA_TRANSFERFT: nullifier exists => note has been spent already");
                nf.emplace(_self, [&](auto& n) {
                    n.val = za->ins.nf;
                });
                break;
            }
            
            case ZA_TRANSFERNFT:
            {
                // TODO
                break;
            }
            
            case ZA_BURNFT:
            {
                // check if root is valid
                check(is_root_valid(za->ins.anchor), "ZA_BURNFT: root invalid");
                // TODO all the other checks for BURNFT (ZEOS Book)
                // check if nullifier already exists in list, if not add it
                nf_t nf(_self, _self.value);
                auto it = nf.find(*reinterpret_cast<uint64_t*>(za->ins.nf.extract_as_byte_array().data()));
                check(it == nf.end(), "ZA_BURNFT: nullifier exists => note has been spent already");
                nf.emplace(_self, [&](auto& n) {
                    n.val = za->ins.nf;
                });
                // payout b to user account
                // TODO
                break;
            }
            
            case ZA_BURNFT2:
            {
                // check if root is valid
                check(is_root_valid(za->ins.anchor), "ZA_BURNFT: root invalid");
                // TODO all the other checks for BURNFT2 (ZEOS Book)
                // check if nullifier already exists in list, if not add it
                nf_t nf(_self, _self.value);
                auto it = nf.find(*reinterpret_cast<uint64_t*>(za->ins.nf.extract_as_byte_array().data()));
                check(it == nf.end(), "ZA_BURNFT: nullifier exists => note has been spent already");
                nf.emplace(_self, [&](auto& n) {
                    n.val = za->ins.nf;
                });
                // payout b to user account
                // TODO
                // payout c to user account
                // TODO
                break;
            }
            
            case ZA_BURNNFT:
            {
                // TODO
                break;
            }
            
            case ZA_BURNAUTH:
            {
                // TODO
                break;
            }
        }
    }
}

void thezeostoken::ontransfer(
    name from,
    name to,
    asset quantity,
    string memo
)
{
    if(to == _self)
    {
        // buffer quantity & owner contract
        auto l = ab.get_or_default({list<extended_asset>()}).assets;
        l.push_back(extended_asset(quantity, get_first_receiver()));
        ab.set({l}, _self);
    }
}

void thezeostoken::init(
    const uint64_t& tree_depth
)
{
    require_auth(_self);

    // empty all tables (en, mt, nf, rt)
    en_t en(_self, _self.value);
    for(auto it = en.begin(); it != en.end(); )
        it = en.erase(it);
    mt_t mt(_self, _self.value);
    for(auto it = mt.begin(); it != mt.end(); )
        it = mt.erase(it);
    nf_t nf(_self, _self.value);
    for(auto it = nf.begin(); it != nf.end(); )
        it = nf.erase(it);
    rt_t rt(_self, _self.value);
    for(auto it = rt.begin(); it != rt.end(); )
        it = rt.erase(it);
    
    // reset global state
    global.remove();
    global.set({0, 0, tree_depth, checksum256()}, _self);
}

void thezeostoken::create(
    const name& issuer,
    const asset& maximum_supply
)
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

void thezeostoken::issue(
    const name& to,
    const asset& quantity,
    const string& memo
)
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

void thezeostoken::retire(
    const asset& quantity,
    const string& memo
)
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

void thezeostoken::transfer(
    const name& from,
    const name& to,
    const asset& quantity,
    const string& memo
)
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

void thezeostoken::open(
    const name& owner,
    const symbol& symbol,
    const name& ram_payer
)
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

void thezeostoken::close(
    const name& owner,
    const symbol& symbol
)
{
    require_auth(owner);
    accounts acnts(get_self(), owner.value);
    auto it = acnts.find(symbol.code().raw());
    check(it != acnts.end(), "Balance row already deleted or never existed. Action won't have any effect.");
    check(it->balance.amount == 0, "Cannot close because the balance is not zero.");
    acnts.erase(it);
}

void thezeostoken::add_balance(
    const name& owner,
    const asset& value,
    const name& ram_payer
)
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

void thezeostoken::sub_balance(
    const name& owner,
    const asset& value
)
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

asset thezeostoken::get_supply(
    const symbol_code& sym
) const
{
    stats statstable(_self, sym.raw());
    const auto& st = statstable.get(sym.raw());
    return st.supply;
}

asset thezeostoken::get_balance(
    const name& owner,
    const symbol_code& sym
) const
{
    accounts accountstable(_self, owner.value);
    const auto& ac = accountstable.get(sym.raw());
    return ac.balance;
}

checksum256 thezeostoken::update_merkle_tree(
    const checksum256& tree_root,
    const uint64_t& leaf_count,
    const uint64_t& tree_depth,
    const vector<const uint8_t*>& leaves
)
{
    // build uri string by concatening all input parameters for the vcpu handler
    string str = "zeos_merkle_tree_updater://";
    str.append(byte2str<32>(tree_root.extract_as_byte_array().data()));
    str.append("/");
    str.append(to_string(leaf_count));
    str.append("/");
    str.append(to_string(tree_depth));
    str.append("/");
    for(auto it = leaves.begin(); it != leaves.end(); ++it)
    {
        str.append(byte2str<32>(*it));
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

    // determine root indices: the current tree root (rt1) changes anyways. in case the tree overflows into a new one
    // we need to add the second root (rt2) of the new tree as well
    uint64_t rt1_tree_idx =  leaf_count                  / MT_NUM_LEAVES(tree_depth);
    uint64_t rt2_tree_idx = (leaf_count + leaves.size()) / MT_NUM_LEAVES(tree_depth);
    uint64_t rt1_idx = rt1_tree_idx * MT_ARR_FULL_TREE_OFFSET(tree_depth);
    uint64_t rt2_idx = rt2_tree_idx * MT_ARR_FULL_TREE_OFFSET(tree_depth);

    // check if tree_root didn't change during execution of the vcpu handler function:
    checksum256 old_root = *reinterpret_cast<array<uint8_t, 32>*>(&res[8]);
    check(tree_root == old_root, "Merkle tree state changed during vcpu handler execution. Please try again.");

    // modify/insert nodes (40 bytes each) into tree
    mt_t tree(_self, _self.value);
    rt_t roots(_self, _self.value);
    check(res.size() % 40 == 0, "Node list must be multiple of 40 bytes: 8 bytes 'index', 32 bytes 'value'");
    checksum256 new_root = checksum256();
    for(int i = 1; i < res.size()/40; i++)
    {
        uint64_t* idx_ptr = reinterpret_cast<uint64_t*>(&res[i*40]);
        // the following might look a bit 'hacky' but it saves us one memcpy and should be safe according
        // to the STL (https://stackoverflow.com/questions/11205186/treat-c-cstyle-array-as-stdarray)
        checksum256 val = *reinterpret_cast<array<uint8_t, 32>*>(&res[i*40 + 8]);

        // MSB of idx determines if node already exists or is new
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

        // add root node to 'roots' table
        if((*idx_ptr & 0x7FFFFFFFFFFFFFFF) == rt1_idx)
        {
            roots.emplace(_self, [&](auto& row) {
                row.val = val;
            });
            new_root = val;
        }
        // in case of tree overflow add second root at root2 index as well
        if(rt2_idx != rt1_idx && (*idx_ptr & 0x7FFFFFFFFFFFFFFF) == rt2_idx)
        {
            roots.emplace(_self, [&](auto& row) {
                row.val = val;
            });
            new_root = val;
        }
    }

    return new_root;
}
void thezeostoken::testmtupdate(
    const uint64_t& num
)
{
    vector<array<uint8_t, 32> > v;
    if(num == 0)
    {
        // create vector with one empty leaf
        array<uint8_t, 32> nc_empty = array<uint8_t, 32>{249, 255, 255, 255, 132, 169, 195, 207, 62, 48, 229, 190, 27, 209, 17, 16, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 63};
        v.push_back(nc_empty);
    }
    else
    {
        // create vector with <num> leaves
        array<uint8_t, 32> nc = array<uint8_t, 32>{static_cast<uint8_t>(num), 255, 255, 255, 132, 169, 195, 207, 62, 48, 229, 190, 27, 209, 17, 16, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 63};
        for(int i = 0; i < num; i++)
            v.push_back(nc);
    }
    vector<const uint8_t*> v_;
    for(int i = 0; i < num; i++)
        v_.push_back(v[i].data());
    // fetch global stats, add leaves, and update global stats
    check(global.exists(), "need to call init first");
    auto g = global.get();
    g.tree_root = update_merkle_tree(g.tree_root, g.leaf_count, g.tree_depth, v_);
    // update global stats
    g.leaf_count += v_.size();
    global.set(g, _self);
}
void thezeostoken::testaddnote(
    const vector<TransmittedNoteCiphertext>& notes
)
{
    // add transmitted notes to list of encrypted notes
    if(notes.size() > 0)
    {
        auto stats = global.get();
        // retrieve current block number
        uint64_t bn = static_cast<uint64_t>(current_block_number());
        en_t enc_notes(_self, _self.value);
        for(uint64_t i = 0; i < notes.size(); ++i)
        {
            check(notes[i].epk_bytes.length()      ==  32 * 2, "length of string 'epk_bytes' must equal 64");
            check(notes[i].enc_ciphertext.length() == 644 * 2, "length of string 'enc_ciphertext' must equal 1288");
            check(notes[i].out_ciphertext.length() ==  80 * 2, "length of string 'out_ciphertext' must equal 160");
            enc_notes.emplace(_self, [&](auto& row){
                row.id = stats.note_count + i;
                row.block_number = bn;
                row.encrypted_note = notes[i];
            });
        }
        // update global stats
        stats.note_count += notes.size();
        global.set(stats, _self);
    }
}

bool thezeostoken::is_root_valid(
    const checksum256& root
)
{
    rt_t roots(_self, _self.value);
    auto it = roots.find(*reinterpret_cast<uint64_t*>(root.extract_as_byte_array().data()));
    return it != roots.end();
}