<template>
  <v-container>
    <v-row justify="center" align="center" class="my-5">
      <h2>First time here?</h2>
      <v-btn class="mx-5" color="secondary" to="/register">Sign up</v-btn>
    </v-row>
    <v-row justify="center" align="center" class="my-5">
      <v-col cols="10" md="6" class="text-center">
        <h1>Log In</h1>
        <v-alert v-if="message" class="my-5" dense :type="message.type">
          {{ message.text }}
        </v-alert>
        <v-form ref="form" class="mx-2" lazy-validation>
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

    emailRules: [
      (v) => !!v || "Email address is required",
      (v) =>
        /^(([^<>()[\]\\.,;:\s@']+(\.[^<>()\\[\]\\.,;:\s@']+)*)|('.+'))@cam.ac.uk$/.test(
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
            this.$router.replace("chat");
          })
          .catch((error) => {
            this.message = error;
          });
      }
    },
  },
};
</script>

<style scoped>
</style>