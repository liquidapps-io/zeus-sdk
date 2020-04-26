#include "../dappservices/oracle.hpp"
#include "../dappservices/cron.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  CRON_DAPPSERVICE_ACTIONS \
  ORACLE_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  ORACLE_SVC_COMMANDS()CRON_SVC_COMMANDS()

#define CONTRACT_NAME() pricefeed 

// define custom filter
#undef ORACLE_HOOK_FILTER
#define ORACLE_HOOK_FILTER(uri, data) filter_result(uri, data);

CONTRACT_START()

    private:

        // create average
        float average(std::vector<float> &vf) {
            float sum = 0;
            // iterate over all elements
            for (int p:vf){
                sum = sum + p;
            }
            return (sum/vf.size());
        }
        
        // create median
        float median(std::vector<float> &vf){
            size_t n = vf.size() / 2;
            std::nth_element(vf.begin(), vf.begin()+n, vf.end());
            int vn = vf[n];
            if(vf.size()%2 == 1) {
                return vn;
            } else {
                std::nth_element(vf.begin(), vf.begin()+n-1, vf.end());
                return 0.5*(vn+vf[n-1]);
            }
        }

        // convert string to float
        float stof(const char* s) {
            float rez = 0, fact = 1;
            if (*s == '-') {
                s++;
                fact = -1;
            }
            for (int point_seen = 0; *s; s++) {
                if (*s == '.') {
                    if (point_seen) return 0;
                    point_seen = 1; 
                    continue;
                }
                int d = *s - '0';
                if (d >= 0 && d <= 9) {
                    if (point_seen) fact /= 10.0f;
                    rez = rez * 10.0f + (float)d;
                } else return 0;
            }
            return rez * fact;
        }

        // use singleton to hold last price of contract 
        TABLE prevprice {
            float   last_price; // set on first request
        };
        typedef eosio::singleton<"prevprice"_n, prevprice> prev_price_t;
        
        // use singleton to hold upper and lower bound threshold
        // 1 = 1%
        TABLE feedsettings {
            // minimum amount of DSPs that need to be heard from to consider a response valid
            uint32_t   threshold = 1; // defaults to 1 so if 1 DSP returns a value, the oracle fetch is deemed valid
            float lower_bound_filter = 1; // defaults 1 percentage of lower difference for asserting deviation compared to last price
            float upper_bound_filter = 1; // defaults 1 percentage of upper difference for asserting deviation compared to last price
            float lower_bound_dsp = 1; // defaults 1 percentage of lower difference for asserting DSP deviation in response
            float upper_bound_dsp = 1; // defaults 1 percentage of upper difference for asserting DSP deviation in response
        };
        typedef eosio::singleton<"settings"_n, feedsettings> feed_settings_t;

        // use singleton to hold bool whether to continue cron
        TABLE callbackbool {
            bool callbackbool = true;
        };
        typedef eosio::singleton<"callbackbool"_n, callbackbool> callback_bool_t;

        // access response data before geturi returned by DSP, this is to reduce CPU costs 
        // so that a price update happens when a significant price change happens
        void filter_result(std::vector<char> uri, std::vector<char> data){
            // get feed settings
            feed_settings_t feed_settings_singleton(_self, _self.value);
            feedsettings feed_settings = feed_settings_singleton.get_or_default();
            float lower_bound_percent = feed_settings.lower_bound_filter * .01;
            float upper_bound_percent = feed_settings.upper_bound_filter * .01;
            // fetch previous price
            prev_price_t prev_price_singleton(_self, _self.value);
            // if singleton exists with a value, compare with previous value
            if(prev_price_singleton.exists()){
                // convert response to string then to float
                string res = string( data.begin(), data.end() );
                float new_last_price = stof(res.c_str());
                // get previous price
                prevprice prev_price = prev_price_singleton.get();
                float last_price = prev_price.last_price;
                // check that price has not changed by more or less than 1%, if so, allow to update, if not, assert to not bill for CPU
                bool nltplp = new_last_price < last_price * (1-lower_bound_percent);
                bool ngtplp = new_last_price > last_price * (1+upper_bound_percent);
                // setup custom assertion so that DSP can detect and perform logic
                std::string cron_assertion = "{abort_service_request}";
                eosio::check(nltplp || ngtplp, cron_assertion);
            }
        }
        
        // cron logic
        bool timer_callback(name timer, std::vector<char> uri, uint32_t seconds){
            // get feed settings
            feed_settings_t feed_settings_singleton(_self, _self.value);
            feedsettings feed_settings = feed_settings_singleton.get_or_default();
            uint32_t dsp_threshold = feed_settings.threshold;
            float lower_bound_percent = feed_settings.lower_bound_dsp * .01;
            float upper_bound_percent = feed_settings.upper_bound_dsp * .01;
            // fetch oracle responses
            getURI(uri, [&]( auto& results ) { 
                // check threshold of DSP responses needed is met
                eosio::check(results.size() >= dsp_threshold, "total amount of DSP responses received are less than minimum threshold specified");
                // set first response as 'first', precrement itr
                auto itr = results.begin();
                auto first = itr->result;
                ++itr;
                // convert response to string then to float
                string res = string( first.begin(), first.end() );
                float firs_price = stof(res.c_str());
                // vector for average of responses
                std::vector<float> price_responses;
                // add first price
                price_responses.push_back(firs_price);
                // loop through results to ensure all results returned by the DSPs within 1% of each other
                while(itr != results.end()) {
                    /* 
                        if want to make sure each DSP returns the same result:
                        eosio::check(itr->result == first, "consensus failed, DSPs did not return exact same result");
                        ++itr;
                    */
                    // convert current result to float
                    string itr_res = string( itr->result.begin(), itr->result.end() );
                    float itr_price = stof(itr_res.c_str());
                    // check against upper and lower bounds for threshold of price deviation to not consider significant, e.g., 1% difference up or down
                    eosio::check(itr_price > firs_price * (1-lower_bound_percent), "consensus failed, DSPs returned responses with more than 1 percent deviation");
                    eosio::check(itr_price < firs_price * (1+upper_bound_percent), "consensus failed, DSPs returned responses with more than 1 percent deviation");
                    // push back iterator price
                    price_responses.push_back(itr_price);
                    ++itr;
                }
                // create average price
                float average_price = average(price_responses);
                // or median
                float median_price = average(price_responses);
                // set new last price in singleton
                prev_price_t prev_price_singleton(_self, _self.value);
                prevprice prev_price;
                prev_price.last_price = average_price; // change to median here
                prev_price_singleton.set(prev_price, _self);
                return results[0].result;
            });
            // reschedule infinitely, can use logic to return true or false, false breaks loop
            // set bool for timer callback
            callback_bool_t callback_bool_singleton(_self, _self.value);
            callbackbool callback_bool_settings = callback_bool_singleton.get_or_default();
            bool continue_cron = callback_bool_settings.callbackbool;
            return continue_cron;
        }
        
    public:
    
        // test price feed
        [[eosio::action]] 
        void testfeed(std::vector<char> uri, uint32_t interval);

        // settings is optional, it allows you to set the price feed's settings
        [[eosio::action]] 
        void settings(uint32_t new_threshold_val, float lower_bound_filter, float upper_bound_filter, float lower_bound_dsp, float upper_bound_dsp);

        // stop or enable start of price feed cron
        [[eosio::action]] 
        void stopstart(bool stopstart_bool);
        
CONTRACT_END((testfeed)(settings)(stopstart))