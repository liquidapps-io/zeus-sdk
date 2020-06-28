#include "./tokenpeg.hpp"

void tokenpeg::init(
  name sister_code,
  string sister_chain_name,
  name token_contract,
  symbol token_symbol,
  bool processing_enabled,
  bool transfers_enabled,
  uint64_t last_irreversible_block_num,
  bool can_issue,
  uint64_t last_received_releases_id,
  uint64_t last_received_receipts_id,
  uint64_t last_confirmed_block_id,
  uint64_t last_received_transfer_block_id
  )
{
  require_auth(_self);
  settings_table settings_singleton(_self, _self.value);
  settings_t settings = settings_singleton.get_or_default();
  settings.sister_code = sister_code;
  settings.sister_chain_name = sister_chain_name;
  settings.token_contract = token_contract;
  settings.token_symbol = token_symbol;
  settings.processing_enabled = processing_enabled;
  settings.transfers_enabled = transfers_enabled;
  settings.last_irreversible_block_num = last_irreversible_block_num;
  settings.can_issue = can_issue;
  settings.last_received_releases_id = last_received_releases_id;
  settings.last_received_receipts_id = last_received_receipts_id;
  settings.last_confirmed_block_id = last_confirmed_block_id;
  settings.last_received_transfer_block_id = last_received_transfer_block_id;
  settings_singleton.set(settings, _self);
  if (processing_enabled) {
    schedule_timer(name("cnfrmblock"), vector<char>(), 20);
    schedule_timer(name("getreleases"), vector<char>(), 20);
    schedule_timer(name("getreceipts"), vector<char>(), 20);
    schedule_timer(name("hndlreceipt"), vector<char>(), 20);
    schedule_timer(name("hndlrelease"), vector<char>(), 20);
  }
}

void tokenpeg::enable(bool processing_enabled, bool transfers_enabled)
 {
  require_auth(_self);
  settings_table settings_singleton(_self, _self.value);
  // get sister code from settings, generate queries
  settings_t settings = settings_singleton.get_or_default();
  // need to optimize timing?
  if (processing_enabled) {
    schedule_timer(name("cnfrmblock"), vector<char>(), 20);
    schedule_timer(name("getreleases"), vector<char>(), 20);
    schedule_timer(name("getreceipts"), vector<char>(), 20);
    schedule_timer(name("hndlreceipt"), vector<char>(), 20);
    schedule_timer(name("hndlrelease"), vector<char>(), 20);
  }
  settings.processing_enabled = processing_enabled;
  settings.transfers_enabled = transfers_enabled;
  settings_singleton.set(settings, _self);
}

void tokenpeg::transfer(name from, name to, asset quantity, string memo) {
  pending_transfers_table_t pending_transfers(_self, _self.value);
  settings_table settings_singleton(_self, _self.value);
  settings_t settings = settings_singleton.get_or_default();
  if (get_first_receiver() != settings.token_contract || from == _self) {
    return;
  }
  check(quantity.symbol == settings.token_symbol, "Incorrect symbol");
  check(settings.transfers_enabled, "transfers disabled");
  uint64_t last_transfers_block_id = settings.last_received_transfer_block_id;
  // to_account,to_chain is memo format
  vector<string> split_memo = split(memo, ",");
  transfer_t current_transfer = { from, split_memo[0], split_memo[1], quantity };

  auto p_transfers = pending_transfers.find(last_transfers_block_id);
  // if all pending transfers have been confirmed
  if (p_transfers == pending_transfers.end()) {
    settings.last_received_transfer_block_id += 1;
    settings_singleton.set(settings, _self);
    vector<transfer_t> transfers{ current_transfer };
    pending_transfers.emplace(_self, [&]( auto& a ){
      a.id = last_transfers_block_id + 1;
      a.transfers = transfers;
      a.received_block_time = eosio::current_time_point().sec_since_epoch();
    });
  }
  // if this is the first transfer in a new block
  else if (p_transfers->received_block_time < eosio::current_time_point().sec_since_epoch()) {
    settings.last_received_transfer_block_id += 1;
    settings_singleton.set(settings, _self);
    vector<transfer_t> transfers{ current_transfer };
    pending_transfers.emplace(_self, [&]( auto& a ){
      a.id = last_transfers_block_id + 1;
      a.transfers = transfers;
      a.received_block_time = eosio::current_time_point().sec_since_epoch();
    });
  }
  // if this is not the first transfer in this block
  else {
    pending_transfers.modify(p_transfers, _self, [&]( auto& a ){
      a.transfers.emplace_back(current_transfer);
    });
  }
}
