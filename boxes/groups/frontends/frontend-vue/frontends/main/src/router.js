import Vue from 'vue'
import Router from 'vue-router'


Vue.use(Router)
import _router from './_router';
var routes = _router(Vue);

export default new Router({
  routes
})
