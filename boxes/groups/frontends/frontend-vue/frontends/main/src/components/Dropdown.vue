<template>
    <li class="dropdown " v-click-outside="outside" :class="{ open: visible}">
        <slot name="button"></slot>
        <slot name="dropdown" :v-show="visible"></slot>
    </li>
</template>
<script>

export default {
    name: "Dropdown",
    data(){
        return {
            visible: false,
            dropdownElm: null
        }
    },
    props:['html'],
    directives: {
    'click-outside': {
      bind: function(el, binding, vNode) {
        // Provided expression must evaluate to a function.
        if (typeof binding.value !== 'function') {
        	const compName = vNode.context.name
          let warn = `[Vue-click-outside:] provided expression '${binding.expression}' is not a function, but has to be`
          if (compName) { warn += `Found in component '${compName}'` }
          
          console.warn(warn)
        }
        // Define Handler and cache it on the element
        const bubble = binding.modifiers.bubble
        const handler = (e) => {
          if (bubble || (!el.contains(e.target) && el !== e.target)) {
          	binding.value(e)
          }
        }
        el.__vueClickOutside__ = handler

        // add Event Listeners
        document.addEventListener('click', handler)
			},
      
      unbind: function(el, binding) {
        // Remove Event Listeners
        document.removeEventListener('click', el.__vueClickOutside__)
        el.__vueClickOutside__ = null

      }
    }
    },
    watch: {
        visible(){
            if(this.visible){
            }else{

            }
        }
    },
    // render (createElement) {
    //     return createElement(
    //         this.html,   // tag name 标签名称
    //         this.$slots.button, // 子组件中的阵列
    //         this.$slots.dropdown
    //     )
    // },
    created(){
        console.log('Dropdown created', this.$slots);
    },

    beforeMount() {
        console.log('Dropdown beforeMount', this.$slots);
    },

    mounted(){
        console.log('Dropdown mounted', this.$slots);

        var triggerElm =  this.$slots.button[0].elm;
        
        triggerElm.addEventListener('click', () => {
            console.log('click')
            this.handleClick();
        });

        if(this.$slots.dropdown[0]){
            var dropdownElm = this.dropdownElm = this.$slots.dropdown[0].elm;
            dropdownElm.addEventListener('click', (event) => {
                if(event.target.parentNode.nodeName == "LI"){
                    this.visible = false;
                }
                console.log('drop down click', event.target, )
            });
        }
        // triggerElm
        this.popupItem = this.$el;
        console.log('triggerElm', triggerElm, this.$slots.button)
    },
    methods: {
        hide () {
            console.log('hide');
            this.visible = false
        },
        handleClick(){
            this.visible = !this.visible;
            console.log('toggle')
        },
        outside(){
            this.visible && ( this.visible = false);
            console.log('click outside')
        }
    }
}
</script>

<style>
.dropdown{
    position: relative;
}
</style>
