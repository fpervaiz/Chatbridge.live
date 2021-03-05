<template>
  <v-container>
    <v-row justify="center" align="center" class="my-5">
      <v-col justify="center" align="center">
        <v-alert v-if="message" class="my-5" dense :type="message.type">
          {{ message.text }}
        </v-alert>
        <v-btn color="primary" @click="loginRaven"
          ><v-icon dark left> mdi-login </v-icon>Log in via Raven</v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "LoginRaven",

  data: () => ({
    message: null,
  }),

  methods: {
    loginRaven() {
      this.message = null;

      this.$store
        .dispatch("loginUserViaRavenAction")
        .then((response) => {
          this.message = response;
          this.$analytics.logEvent("login");
          this.$router.replace("chat");
        })
        .catch((error) => {
          this.message = error;
        });
    },
  },
};
</script>

<style scoped>
</style>