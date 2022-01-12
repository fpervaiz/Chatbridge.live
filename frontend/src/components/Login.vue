<template>
  <v-container>
    <v-row justify="center" align="center" class="my-5">
      <v-col justify="center" align="center">
        <v-alert
          v-if="ravenMessage"
          class="my-5"
          dense
          :type="ravenMessage.type"
        >
          {{ ravenMessage.text }}
        </v-alert>
        <v-btn large color="primary" @click="loginRaven"
          ><v-icon dark left> mdi-login </v-icon>University of Cambridge:<br />Log
          in via Raven</v-btn
        >
        <v-divider class="mt-10"></v-divider>
      </v-col>
    </v-row>
    <v-row justify="center" align="center" class="my-5">
      <h2>First time here?</h2>
      <v-btn class="mx-5" color="secondary" to="/register">Sign up</v-btn>
    </v-row>
    <v-row justify="center" align="center" class="mt-10 mb-5">
      <v-col cols="10" md="6" class="text-center">
        <h1>Log In</h1>
        <v-alert v-if="message" class="my-5" dense :type="message.type">
          {{ message.text }}
        </v-alert>
        <v-form ref="form" class="mx-2 my-5" lazy-validation>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="email"
                type="email"
                :rules="emailRules"
                label="University Email Address"
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="password"
                type="password"
                :rules="passwordRules"
                label="Password"
                required
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row justify="center" align="center"
            ><v-btn color="primary" class="my-5" @click="login">
              Log In
            </v-btn></v-row
          >
          <v-row justify="center" align="center"
            ><v-btn to="/resetPassword" color="secondary" class="my-5">
              Forgot your password?</v-btn
            ></v-row
          >
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "Login",

  data: () => ({
    email: "",
    password: "",

    message: null,
    ravenMessage: null,

    emailRules: [
      (v) => !!v || "Email address is required",
      (v) =>
        // eslint-disable-next-line
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
          v
        ) || "Invalid email address",
    ],

    passwordRules: [(v) => !!v || "Password is required"],
  }),

  methods: {
    login() {
      this.message = null;

      if (this.$refs.form.validate()) {
        this.$store
          .dispatch("loginUserAction", {
            email: this.email,
            password: this.password,
          })
          .then((response) => {
            this.message = response;
            this.$analytics.logEvent("login");
            this.$router.replace("chat");
          })
          .catch((error) => {
            this.message = error;
          });
      }
    },

    loginRaven() {
      this.ravenMessage = null;

      this.$store
        .dispatch("loginUserViaRavenAction")
        .then((response) => {
          this.ravenMessage = response;
          this.$analytics.logEvent("login");
          this.$router.replace("chat");
        })
        .catch((error) => {
          this.ravenMessage = error;
        });
    },
  },
};
</script>

<style scoped>
</style>