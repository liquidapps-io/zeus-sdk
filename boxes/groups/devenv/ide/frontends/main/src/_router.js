import Pen from './views/Pen.vue';
export default (Vue) => {
  return [{
    path: '/p/:project',
    name: 'Project',
    component: Pen
  },
  {
    path: '/',
    name: 'home',
    component: Pen
  }
  ];
};
