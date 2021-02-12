<template>
  <v-app-bar height="84" flat app>
    <v-spacer></v-spacer>
    <v-img
      class="mx-1 mb-3"
      src="@/assets/chat.svg"
      max-height="36"
      max-width="36"
      contain
    ></v-img>

    <v-app-bar-title class="ml-2 logo"> chatbridge </v-app-bar-title>
    <v-layout align-center justify-end>
      <v-btn v-if="userLoggedIn" @click="logout" icon>
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-layout>
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
.logo {
  font-family: "a Affirmation";
  font-size: 56px;
}
</style>