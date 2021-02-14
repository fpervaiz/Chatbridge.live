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
    <v-app-bar-title class="ml-2">
      <router-link class="logo" to="/">
        chatbridge
      </router-link></v-app-bar-title
    >
    <v-layout align-center justify-end>
      <v-menu v-if="userLoggedIn" v-model="menu" offset-y>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" icon>
            <v-icon>mdi-account</v-icon>
          </v-btn>
        </template>

        <v-card>
          <v-list>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon>mdi-account</v-icon>
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title>{{ userEmail }}</v-list-item-title>
                <v-list-item-subtitle
                  >University of Cambridge</v-list-item-subtitle
                >
              </v-list-item-content>
            </v-list-item>
          </v-list>

          <v-divider></v-divider>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="logout()"> Logout </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
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

    userEmail() {
      return this.$store.getters.getUserEmail;
    },

    userUniversity() {
      return this.$store.getters.university;
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
.logo {
  font-family: "a Affirmation";
  font-size: 56px;
  text-decoration: none;
  color: white;
}
</style>