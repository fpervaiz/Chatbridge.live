<template>
  <v-app-bar height="84" :extension-height="extensionHeight" flat app>
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
      <v-menu v-if="userLoggedIn" offset-y>
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

    <template v-if="eventBanner" v-slot:extension>
      <div class="text-center">
        <a
          class="event-link font-weight-bold"
          target="_blank"
          :href="eventBanner.link"
          >{{ eventBanner.name }}</a
        >
        -
        <vue-countdown
          :time="new Date(eventBanner.start_time) - Date.now()"
          v-slot="{ days, hours, minutes, seconds }"
          :emit-events="false"
        >
          starts in {{ days }} days, {{ hours }} hours, {{ minutes }} minutes,
          {{ seconds }} seconds
        </vue-countdown>
      </div>
    </template>
  </v-app-bar>
</template>

<script>
import firebase from "firebase";
import "firebase/remote-config";
import VueCountdown from "@chenfengyuan/vue-countdown";

export default {
  name: "NavBar",

  components: { VueCountdown },

  data() {
    return {
      remoteConfig: null,
      eventBanner: null,
    };
  },

  created() {
    this.remoteConfig = firebase.remoteConfig();
    this.remoteConfig.settings.minimumFetchIntervalMillis = 3600000;

    this.remoteConfig
      .fetchAndActivate()
      .then(() => {
        let eventBannerJson = this.remoteConfig.getValue("event_banner")._value;
        if (eventBannerJson) {
          this.eventBanner = JSON.parse(eventBannerJson);
        }
      })
      .catch((err) => console.log(err));
  },

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
    extensionHeight() {
      switch (this.$vuetify.breakpoint.name) {
        case "xs":
          return 48;
        default:
          return 24;
      }
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
/deep/ div.v-toolbar__extension {
  background-color: crimson;
  justify-content: center;
}
.event-link {
  color: white;
}
</style>