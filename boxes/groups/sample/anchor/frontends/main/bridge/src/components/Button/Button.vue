<template>
  <button @click="btnOnClick()">{{ btnText }}</button>
</template>

<script>
export default {
  props: {
    btnText: {
      type: String,
      required: true,
      default: "CONNECT WALLET"
    },
    btnOnClick: {
      type: Function
    }
  }
}
</script>

<style>

</style>