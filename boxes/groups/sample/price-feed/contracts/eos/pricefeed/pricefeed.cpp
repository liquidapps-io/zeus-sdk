#include "./pricefeed.hpp"

void pricefeed::testfeed(std::vector<char> uri, uint32_t interval) {
  require_auth(_self);
  // schedule cron based on uri (oracle endpoint syntax provided) and interval
  // (time in seconds to repeat the cron)
  schedule_timer(_self, uri, interval);
}

// settings is optional as the defaults will be used for the DSP threshold,
// max retries, and the upper/lower threshold in the case it is not called
void pricefeed::settings(uint32_t new_threshold_val, float lower_bound_filter, 
  float upper_bound_filter, float lower_bound_dsp, float upper_bound_dsp) {
  // require auth of contract
  require_auth(_self);
  // set feed settings
  feed_settings_t feed_settings_singleton(_self, _self.value);
  feedsettings new_feed_settings = feed_settings_singleton.get_or_default();
  new_feed_settings.upper_bound_filter = upper_bound_filter;
  new_feed_settings.lower_bound_filter = lower_bound_filter;
  new_feed_settings.upper_bound_dsp = upper_bound_dsp;
  new_feed_settings.lower_bound_dsp = lower_bound_dsp;
  new_feed_settings.threshold = new_threshold_val;
  feed_settings_singleton.set(new_feed_settings, _self);
}

void pricefeed::stopstart(bool stopstart_bool) {
  // require auth of contract
  require_auth(_self);
  // set bool for timer callback
  callback_bool_t callback_bool_singleton(_self, _self.value);
  callbackbool new_callback_bool_settings;
  new_callback_bool_settings.callbackbool = stopstart_bool;
  callback_bool_singleton.set(new_callback_bool_settings, _self);
}