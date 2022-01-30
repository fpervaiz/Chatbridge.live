<template>
  <v-container>
    <v-row justify="center" align="center" class="text-center"
      ><v-col> <Logo /> </v-col
    ></v-row>
    <v-row justify="center" align="center" class="mb-5">
      <v-col
        cols="10"
        md="6"
        class="text-center d-flex flex-column align-center"
      >
        <h1>Log In</h1>

        <v-alert v-if="message" class="my-5" dense :type="message.type">
          {{ message.text }}
        </v-alert>
        <v-sheet rounded="xl" max-width="360px" class="mt-5 px-8">
          <v-btn
            outlined
            class="my-5"
            large
            color="red accent-1"
            @click="loginRaven"
            ><v-icon dark left>mdi-login</v-icon
            ><span class="mx-2"
              >University of Cambridge:<br />Log in via Raven</span
            ></v-btn
          >
          <v-divider />
          <h3 class="my-5">
            First time here? <router-link to="/register">Sign up</router-link>
          </h3>
          <v-form ref="form" class="my-5" lazy-validation>
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
              <v-col class="mt-n6" cols="12">
                <v-text-field
                  v-model="password"
                  type="password"
                  :rules="passwordRules"
                  label="Password"
                  required
                ></v-text-field>
                <router-link to="/resetPassword"
                  ><p>Forgot your password?</p></router-link
                >
              </v-col>
            </v-row>

            <v-row justify="center" align="center"
              ><v-btn color="primary" class="my-5" @click="login">
                Log In
              </v-btn></v-row
            >
          </v-form>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Logo from "./Logo";

export default {
  name: "Login",

  components: { Logo },

  data: () => ({
    email: "",
    password: "",

    message: null,

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