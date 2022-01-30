<template>
  <v-container>
    <v-row class="text-center">
      <v-col class="mb-4">
        <Logo />
        <h1 class="display-1 mb-5">
          Chat anonymously with other students from your university.
        </h1>

        <h2 class="subheading font-weight-regular">{{ subtitle }}</h2>
        <p class="mt-12 mb-5">
          You must be a university student to use Chatbridge.
        </p>
        <v-btn to="/rules" class="mx-2" color="primary">Start chatting</v-btn>
        <v-btn to="/about" class="mx-2" color="secondary">Tell me more</v-btn>
        <h5 class="mt-16" v-if="userLoggedIn">
          Logged in as {{ userIdentity }}. <a @click="logout()">Log out</a>
        </h5>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Logo from "./Logo";
import utils from "@/utils";

export default {
  name: "HomePage",

  components: { Logo },

  data() {
    return {
      subtitles: [
        //"Rumour has it Stephen Toope is on here.",
        "Find the one you've been looking for.",
        "Scientifically proven to be more fun than binging lectures.",
        //"Isn't the name clever?",
        "Ain't no pandemic large enough.",
      ],
      subtitle: null,
    };
  },

  computed: {
    userLoggedIn() {
      return this.$store.getters.isUserAuth;
    },

    userDisplayName() {
      return this.$store.getters.userDisplayName;
    },

    userIdentity() {
      let email = this.$store.getters.getUserEmail;
      let university = utils.domainToUniversityName(email.split("@")[1]);

      if (university) {
        return `${email} (${university})`;
      } else {
        return email;
      }
    },
  },

  created() {
    this.subtitle =
      this.subtitles[Math.floor(Math.random() * this.subtitles.length)];
  },

  methods: {
    logout() {
      this.$store.dispatch("logoutUserAction").then(() => {
        this.$analytics.logEvent("logout");
      });
    },
  },
};
</script>

<style scoped>
</style>