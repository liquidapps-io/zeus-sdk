#define USE_ADVANCED_IPFS
#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"
#include "../dappservices/ipfs.hpp"
#include "../dappservices/multi_index.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  CRON_DAPPSERVICE_ACTIONS \
  IPFS_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()IPFS_SVC_COMMANDS()

// define custom filter
#undef ORACLE_HOOK_FILTER
#define ORACLE_HOOK_FILTER(uri, data) filter_result(uri, data);

#define CONTRACT_NAME() tokenpeg

CONTRACT_START()

    private:

        TABLE settings_t {
          name sister_code; // name of corresponding bridge for oracle queries
          string sister_chain_name;
          name token_contract;
          symbol token_symbol;
          bool processing_enabled;
          bool transfers_enabled;
          uint64_t last_irreversible_block_num; // number is preferred...
          bool can_issue; // true if token is being bridged to this chain, else false 
          uint64_t last_received_releases_id;
          uint64_t last_received_receipts_id;
          uint64_t last_confirmed_block_id;
          uint64_t last_received_transfer_block_id;
        };
        typedef eosio::singleton<"settings"_n, settings_t> settings_table;
        typedef eosio::multi_index<"settings"_n, settings_t> settings_table_abi;

        struct transfer_t {
          name from_account;
          string to_account;
          string to_chain;
          //checksum256 to_chain_id;
          asset received_amount;
        };
        // contains all transfers with given timestamp
        TABLE pending_transfers_t {
          uint64_t id;
          std::vector<transfer_t> transfers;
          uint64_t received_block_time; // time instead of block
          uint64_t primary_key()const { return id; }
        };
        typedef eosio::multi_index<"ptransfers"_n, pending_transfers_t> pending_transfers_table_t;

        // this shouldn't be a table but rather an ipfs pointer
        TABLE confirmed_transfers_t {
          uint64_t id;
          uint64_t received_block_time; // time instead of block
          //checksum256 transfers_ipfs_uri;
          string transfers_ipfs_uri;
          uint64_t primary_key()const { return id; }
        };
        typedef eosio::multi_index<"ctransfers"_n, confirmed_transfers_t> confirmed_transfers_table_t;

        struct transfer_receipt {
          name from_account;
          string to_account;
          string to_chain;
          //checksum256 to_chain_id;
          asset received_amount;
          bool success; // if false must return
        };
        TABLE transfers_receipt_t {
          uint64_t id;
          std::vector<transfer_receipt> transfer_receipts;
          uint64_t received_block_time; // time instead of block
          uint64_t primary_key()const { return id; }
        };
        TABLE compressed_transfers_receipt_t {
          uint64_t id;
          string transfer_receipts_uri;
          uint64_t received_block_time; // time instead of block
          uint64_t primary_key()const { return id; }
        };
        // local receipts vs foreign receipts
        typedef eosio::multi_index<"lreceipts"_n, compressed_transfers_receipt_t> compressed_local_receipts_table_t;
        typedef eosio::singleton<"clreceipts"_n, transfers_receipt_t> current_local_receipts_table_t;
        typedef eosio::multi_index<"clreceipts"_n, transfers_receipt_t> current_local_receipts_table_abi;
        typedef eosio::multi_index<"freceipts"_n, compressed_transfers_receipt_t> compressed_foreign_receipts_table_t;
        typedef eosio::singleton<"cfreceipts"_n, transfers_receipt_t> current_foreign_receipts_table_t;
        typedef eosio::multi_index<"cfreceipts"_n, transfers_receipt_t> current_foreign_receipts_table_abi;
        // current receipts being processed (always uncompressed singleton)
        
        struct release {
          name from_account;
          string to_account;
          string to_chain;
          //checksum256 to_chain_id;
          asset received_amount;
        };
        // in case of failed transfers and for 2 way bridge
        TABLE releases_t {
          uint64_t id;
          std::vector<release> releases;
          uint64_t received_time; // time instead of block
        };
        TABLE compressed_releases_t {
          uint64_t id;
          string releases_uri;
          uint64_t received_time; // time instead of block
          uint64_t primary_key()const {return id;}
        };
        typedef eosio::multi_index<"releases"_n, compressed_releases_t> compressed_releases_table_t;
        typedef eosio::singleton<"creleases"_n, releases_t> current_releases_table_t;
        typedef eosio::multi_index<"creleases"_n, releases_t> current_releases_table_abi;

        // oracle to confirm irreversibility
        uint64_t get_last_irreversible_block(string chain_name) {
          // local mainnet needs to be configurable? hmm
          string last_irreversible_uri_string = "sister_chain_last_irreversible://" + chain_name;
          vector<char> last_irreversible_uri(last_irreversible_uri_string.begin(), last_irreversible_uri_string.end());
          vector<char> last_irreversible_string = getURI(last_irreversible_uri, [&]( auto& results ) {
            //eosio::check(results.size() >= dsp_threshold, "total amount of DSP responses received are less than minimum threshold specified");
            return results[0].result;
          });
          // need to check casting works as expected
          uint64_t last_irreversible = *reinterpret_cast<uint64_t *>(&last_irreversible_string);
          return last_irreversible;
        }

        bool handle_failed_release() {
          // load current releases, current local receipts and settings singletons
          current_releases_table_t releases_singleton(_self, _self.value);
          releases_t current_releases = releases_singleton.get_or_default();
          current_local_receipts_table_t receipts_singleton(_self, _self.value);
          transfers_receipt_t current_receipts = receipts_singleton.get_or_default();
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();

          vector<release> pending_releases = current_releases.releases;
          vector<transfer_receipt> release_receipts;
          release current_release;

          // compress current receipts, delete current releases, load new releases
          if (pending_releases.size() == 0) {
            compressed_releases_table_t compressed_releases(_self, _self.value);
            auto c_release = compressed_releases.find(current_releases.id + 1);
            eosio::check(c_release != compressed_releases.end(), "no pending releases"); // abort svc request?
            compressed_local_receipts_table_t compressed_local_receipts(_self, _self.value);
            string compressed_current_receipts_uri = ipfs_svc_helper::setData(current_receipts.transfer_receipts);
            compressed_local_receipts.emplace(_self, [&]( auto& a ){
              a.transfer_receipts_uri = compressed_current_receipts_uri;
              a.id = current_receipts.id;
              a.received_block_time = eosio::current_time_point().sec_since_epoch();
            });
            pending_releases = ipfs_svc_helper::getData<vector<release>>(c_release->releases_uri);
            // modify current releases
            current_releases.id = c_release->id;
            current_releases.received_time = c_release->received_time;
            current_release = pending_releases[0];
            // modify current receipts  
            current_receipts.transfer_receipts = vector<transfer_receipt>();
            current_receipts.id += 1;
          }
          release_receipts = current_receipts.transfer_receipts;
          current_release = pending_releases[0];
          pending_releases.erase(pending_releases.begin());
          transfer_receipt current_receipt = {
            current_release.from_account,
            current_release.to_account,
            current_release.to_chain,
            //checksum256 to_chain_id;
            current_release.received_amount,
            false
          };
          release_receipts.push_back(current_receipt);
          current_receipts.transfer_receipts = release_receipts;

          releases_singleton.set(current_releases, _self);
          receipts_singleton.set(current_receipts, _self);

          return settings.processing_enabled;
        }

        bool handle_release() {
          // load current releases, current local receipts and settings singletons
          current_releases_table_t releases_singleton(_self, _self.value);
          releases_t current_releases = releases_singleton.get_or_default();
          current_local_receipts_table_t receipts_singleton(_self, _self.value);
          transfers_receipt_t current_receipts = receipts_singleton.get_or_default();
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();

          vector<release> pending_releases = current_releases.releases;
          vector<transfer_receipt> release_receipts;
          release current_release;

          // compress current receipts, delete current releases, load new releases
          if (pending_releases.size() == 0) {
            compressed_releases_table_t compressed_releases(_self, _self.value);
            auto c_release = compressed_releases.find(current_releases.id + 1);
            eosio::check(c_release != compressed_releases.end(), "no pending releases"); // abort svc request?
            compressed_local_receipts_table_t compressed_local_receipts(_self, _self.value);
            string compressed_current_receipts_uri = ipfs_svc_helper::setData(current_receipts.transfer_receipts);
            compressed_local_receipts.emplace(_self, [&]( auto& a ){
              a.transfer_receipts_uri = compressed_current_receipts_uri;
              a.id = current_receipts.id;
              a.received_block_time = eosio::current_time_point().sec_since_epoch();
            });
            pending_releases = ipfs_svc_helper::getData<vector<release>>(c_release->releases_uri);
            // modify current releases
            current_releases.id = c_release->id;
            current_releases.received_time = c_release->received_time;
            current_release = pending_releases[0];
            // modify current receipts  
            current_receipts.transfer_receipts = vector<transfer_receipt>();
            current_receipts.id += 1;
          }
          release_receipts = current_receipts.transfer_receipts;
          current_release = pending_releases[0];
          pending_releases.erase(pending_releases.begin());
          transfer_receipt current_receipt = {
            current_release.from_account,
            current_release.to_account,
            current_release.to_chain,
            //checksum256 to_chain_id;
            current_release.received_amount,
            true
          };
          release_receipts.push_back(current_receipt);
          current_receipts.transfer_receipts = release_receipts;

          releases_singleton.set(current_releases, _self);
          receipts_singleton.set(current_receipts, _self);

          if (settings.can_issue) {
            action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
              std::make_tuple(name(current_release.to_account), current_release.received_amount, string("")))
            .send();
          } else {
            action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
              std::make_tuple(_self, name(current_release.to_account), current_release.received_amount, string("")))
            .send();
          }
          return settings.processing_enabled;
        }

        bool handle_receipt() {
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();
          current_foreign_receipts_table_t foreign_receipts_singleton(_self, _self.value);
          transfers_receipt_t current_receipts = foreign_receipts_singleton.get_or_default();

          vector<transfer_receipt> pending_receipts = current_receipts.transfer_receipts;

          if (pending_receipts.size() == 0) {
            compressed_foreign_receipts_table_t compressed_foreign_receipts(_self, _self.value);
            auto cf_receipts = compressed_foreign_receipts.find(current_receipts.id + 1);
            eosio::check(cf_receipts != compressed_foreign_receipts.end(), "no pending receipts");
            pending_receipts = ipfs_svc_helper::getData<vector<transfer_receipt>>(cf_receipts->transfer_receipts_uri);
            current_receipts.id += 1;
          }
          transfer_receipt current_receipt = pending_receipts[0];
          pending_receipts.erase(pending_receipts.begin());
          current_receipts.transfer_receipts = pending_receipts;
          foreign_receipts_singleton.set(current_receipts, _self);
          // handle receipt
          if (current_receipt.success) {
            // do nothing in case of success?
          } else {
            // return locked tokens in case of failure
            if (settings.can_issue) {
              action(permission_level{_self, "active"_n}, settings.token_contract, "issue"_n,
                std::make_tuple(name(current_receipt.to_account), current_receipt.received_amount, string("")))
              .send();
            } else {
              action(permission_level{_self, "active"_n}, settings.token_contract, "transfer"_n,
                std::make_tuple(_self, name(current_receipt.to_account), current_receipt.received_amount, string("")))
              .send();
            }
          }
          return settings.processing_enabled;
        }

        // may need to modify uri to request lrrid+1
        bool handle_get_releases() {
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();
          uint64_t next_releases_id = settings.last_received_releases_id + 1;
          string uri_string =
          "sister_chain_table_row://"
          + settings.sister_chain_name + "/"
          + settings.sister_code.to_string() + "/"
          + "ctransfers/"
          + settings.sister_code.to_string() + "/"
          + fc::to_string(next_releases_id) + "/"
          + "transfers_ipfs_uri/";
          vector<char> uri(uri_string.begin(), uri_string.end());


          vector<char> releases_uri = getURI(uri, [&]( auto& results ) {
            //eosio::check(results.size() >= dsp_threshold, "total amount of DSP responses received are less than minimum threshold specified");
            return results[0].result;
          });
          string releases_uri_string(releases_uri.begin(), releases_uri.end());
          compressed_releases_table_t releases_table(_self, _self.value);
          releases_table.emplace(_self, [&]( auto& a ){
            a.releases_uri = releases_uri_string;
            a.id = next_releases_id;
            a.received_time = eosio::current_time_point().sec_since_epoch();
          });
          settings.last_received_releases_id = next_releases_id;
          settings_singleton.set(settings, _self);
          return settings.processing_enabled;
        }

        // may need to modify uri to request lrrid+1
        bool handle_get_receipts() {
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();
          uint64_t next_receipts_id = settings.last_received_receipts_id + 1;
          string uri_string =
          "sister_chain_table_row://"
          + settings.sister_chain_name + "/"
          + settings.sister_code.to_string() + "/"
          + "lreceipts/"
          + settings.sister_code.to_string() + "/"
          + fc::to_string(next_receipts_id) + "/"
          + "transfer_receipts_uri/";
          vector<char> uri(uri_string.begin(), uri_string.end());

          vector<char> receipts_uri = getURI(uri, [&]( auto& results ) {
            //eosio::check(results.size() >= dsp_threshold, "total amount of DSP responses received are less than minimum threshold specified");
            return results[0].result;
          });
          string receipts_uri_string(receipts_uri.begin(), receipts_uri.end());
          compressed_foreign_receipts_table_t receipts_table(_self, _self.value);
          receipts_table.emplace(_self, [&]( auto& a ){
            a.transfer_receipts_uri = receipts_uri_string;
            a.id = next_receipts_id;
            a.received_block_time = eosio::current_time_point().sec_since_epoch();
          });
          settings.last_received_receipts_id = next_receipts_id;
          settings_singleton.set(settings, _self);
          return settings.processing_enabled;
        }

        // id is increasing counter, not block number
        bool handle_confirm_block() {
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();
          uint64_t next_block_id = settings.last_confirmed_block_id + 1;
          settings.last_confirmed_block_id += 1;
          pending_transfers_table_t pending_transfers(_self, _self.value);
          auto pending_transfers_block = pending_transfers.find(next_block_id);
          // check there exists pending transfers, otherwise abort cron
          eosio::check(pending_transfers_block != pending_transfers.end(), "{abort_service_request}");

          // mismatch between block num and timestamp :/
          if (settings.last_irreversible_block_num > pending_transfers_block->received_block_time) {
            auto transfers_ipfs_uri = ipfs_svc_helper::setData(pending_transfers_block->transfers);
            confirmed_transfers_table_t confirmed_transfers(_self, _self.value);
            confirmed_transfers.emplace(_self, [&](auto& a){
              a.id = pending_transfers_block->id;
              a.received_block_time = pending_transfers_block-> received_block_time;
              a.transfers_ipfs_uri = transfers_ipfs_uri;
            });
            pending_transfers.erase(pending_transfers_block);
          }
          else {
            uint64_t last_irreversible_block_num = get_last_irreversible_block(settings.sister_chain_name);
            settings.last_irreversible_block_num = last_irreversible_block_num;
            settings_singleton.set(settings, _self);
            if (last_irreversible_block_num > pending_transfers_block->received_block_time) {
              auto transfers_ipfs_uri = ipfs_svc_helper::setData(pending_transfers_block->transfers);
              confirmed_transfers_table_t confirmed_transfers(_self, _self.value);
              confirmed_transfers.emplace(_self, [&](auto& a){
                a.id = pending_transfers_block->id;
                a.received_block_time = pending_transfers_block->received_block_time;
                a.transfers_ipfs_uri = transfers_ipfs_uri;
              });
              pending_transfers.erase(pending_transfers_block);
            }
          }
          return settings.processing_enabled;
        }

        // we only want to receive a non-empty manifest uri
        // we also get last irreversible block, should check that it's new
        void filter_result(std::vector<char> uri, std::vector<char> data) {
          // need to hardcode for optimization?
          std::vector emptyDataHash = uri_to_ipfsmultihash(ipfs_svc_helper::setRawData(emptyentry(), true));
          check(data != emptyDataHash, "{abort_service_request}");
        }

        // cron logic
        bool timer_callback(name timer, std::vector<char> payload, uint32_t seconds){
          settings_table settings_singleton(_self, _self.value);
          settings_t settings = settings_singleton.get_or_default();
          check(settings.processing_enabled, "processing disabled");
          if (timer.to_string() == "cnfrmblock") {
            return handle_confirm_block();
          }
          // cron to get token releases (tokens which were locked on the other chain)
          else if (timer.to_string() == "getreleases") {
            return handle_get_releases();
          }
          // cron to get receipts from other chain
          // we then iterate over all receipts from the block to know whether to return tokens
          // and then we can delete that block of transfers
          else if (timer.to_string() == "getreceipts") {
            return handle_get_receipts();
          }
          else if (timer.to_string() == "hndlreceipt") {
            return handle_receipt();
          }
          else if (timer.to_string() == "hndlrelease") {
            return handle_release();
          }
          else {
            eosio::check(false, "unrecognized timer name: " + timer.to_string());
          }
          return false; // make compiler happy
        }
        
    public:
        vector<string> split(const string& str, const string& delim) {
          vector<string> tokens;
          size_t prev = 0, pos = 0;
          do {
            pos = str.find(delim, prev);
            if (pos == string::npos) pos = str.length();
            string token = str.substr(prev, pos-prev);
            tokens.push_back(token);
            prev = pos + delim.length();
          } while (pos < str.length() && prev < str.length());

          return tokens;
        }

        // init
        [[eosio::action]] 
        void init(
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
        );

        [[eosio::action]] 
        void enable(bool processing_enabled, bool transfers_enabled);

        // on transfer hook
        void transfer(name from, name to, asset quantity, string memo);
};

EOSIO_DISPATCH_SVC_TRX(CONTRACT_NAME(), (init)(enable))
