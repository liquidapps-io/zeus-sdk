<template>
  <Button v-bind:btnOnClick="btnOnClick" btn-text="CONNECT WALLET" />
</template>

<script>
import Button from '../Button/Button.vue'

export default {
  components: {
    Button
  },
  props: {
    btnText: {
      type: String,
      required: true,
      default: "CONNECT WALLET"
    }
  }
}
</script>

<style>

</style>