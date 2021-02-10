<template>
  <v-app-bar app>
    <v-row justify="center">
      <v-col cols="3"> </v-col>
      <v-col cols="6" justify="center" align="center" class="mt-1">
        <router-link class="plain-link" to="/"><h2>Chatbridge</h2></router-link>
      </v-col>
      <v-col cols="3" justify="right" align="right">
        <v-btn v-if="userLoggedIn" @click="logout" icon>
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-app-bar>
</template>

<script>
export default {
  name: "NavBar",

  computed: {
    userLoggedIn() {
      return this.$store.getters.isUserAuth;
    },

    userDisplayName() {
      return this.$store.getters.getUserDisplayName;
    },
  },

  methods: {
    logout() {
      this.$store.dispatch("logoutUserAction").then(() => {
        this.$router.replace("/");
      });
    },
  },
};
</script>

<style scoped>
.plain-link {
  text-decoration: none;
  color: white;
}
</style>