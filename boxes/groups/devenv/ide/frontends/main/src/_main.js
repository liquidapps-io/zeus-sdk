import VueCodemirror from 'vue-codemirror';

import 'codemirror/lib/codemirror.css';

export default (Vue) => {
  Vue.use(VueCodemirror
    /* {
  options: { theme: 'base16-dark', ... },
  events: ['scroll', ...]
} */
  );
};
