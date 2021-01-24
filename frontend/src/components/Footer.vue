<template>
  <v-footer>
    <v-container>
      <v-row class="my-1" v-if="userLoggedIn" justify="center"
        ><h5>Logged in as {{ userDisplayName }}</h5>
      </v-row>
      <v-row justify="center" no-gutters>
        <v-btn color="white" text class="my-1"> About </v-btn>
        <v-btn color="white" text class="my-1"> Contact </v-btn>
        <!--
        <v-btn color="white" text class="my-1"> Terms Of Use </v-btn>
        <v-btn color="white" text class="my-1"> Privacy Policy </v-btn>
        -->
      </v-row>
    </v-container>
    <!--
    <v-col class="py-1 text-center white--text" cols="12">
      &copy; {{ new Date().getFullYear() }} — <strong>uniofcam.chat</strong>
    </v-col>
    -->
  </v-footer>
</template>

<script>
export default {
  name: "Footer",

  computed: {
    userLoggedIn() {
      return this.$store.getters.isUserAuth;
    },

    userDisplayName() {
      return this.$store.getters.getUserDisplayName;
    },
  },
};
</script>

<style scoped>
</style>