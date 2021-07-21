<template>
  <div>
    <img src="../../assets/liquidapps.png" alt="LiquidApps Logo">
    <Login v-bind:btnOnClick="login"></Login>
  </div>
</template>

<script>
import Login from '../Login/Login.vue'

export default {
  components: {
    Login
  },
  props: {
    btnOnClick: {
      type: Function
    }
  },
  methods: {
    login: async () => {
        console.log('hi')
        // Perform the login, which returns the users identity
        const identity = await link.login('mydapp')

        // Save the session within your application for future use
        const {session} = identity
        console.log(`Logged in as ${session.auth}`)
    }
  }
}
import AnchorLink from 'anchor-link'
import AnchorLinkBrowserTransport from 'anchor-link-browser-transport'

const transport = new AnchorLinkBrowserTransport()
const link = new AnchorLink({
    transport,
    chains: [
        {
            chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
            nodeUrl: 'https://eos.greymass.com',
        }
    ],
})
</script>

<style scoped>
  img {
    width: 200px;
  }
  div {
    display:flex;
    justify-content: space-between;
  }
</style>