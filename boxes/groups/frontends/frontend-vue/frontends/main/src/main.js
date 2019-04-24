import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './registerServiceWorker'

import contentmenu from 'v-contextmenu'
import 'v-contextmenu/dist/index.css'
import VueTour from 'vue-tour'

Vue.use(contentmenu);

require('vue-tour/dist/vue-tour.css');

Vue.use(VueTour)

Vue.config.productionTip = false

// or import all icons if you don't care about bundle size
import 'vue-awesome/icons'

/* Register component with one of 2 methods */

import Icon from 'vue-awesome/components/Icon'

// globally (in your main .js file)
Vue.component('v-icon', Icon)


function isMobileResolution() {
  var width = window.innerWidth;
  if (width && width < 800) {
    return true;
  }
  return false;
}

var isMobile = isMobileResolution();

Vue.prototype.isMobile = isMobile;

import _main from './_main';
_main(Vue);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
