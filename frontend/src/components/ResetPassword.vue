<template>
  <v-container fluid class="fluid">
    <v-row justify="center" align="center" class="my-5">
      <v-col cols="10" md="6" class="text-center">
        <Logo />
        <h1>Reset your password</h1>
        <p>Enter your university email address below.</p>
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

          <v-row justify="center" align="center"
            ><v-btn color="primary" class="my-5" @click="resetPassword">
              Reset
            </v-btn></v-row
          >
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Logo from "./Logo";

export default {
  name: "Login",

  components: { Logo },

  computed: {},

  data: () => ({
    email: "",
    password: "",

    message: null,

    emailRules: [
      (v) => !!v || "Email address is required",
      (v) =>
        new RegExp(
          // eslint-disable-next-line
          `^(([^<>()[\\]\\.,;:\s@']+(\.[^<>()\\[\]\\.,;:\s@']+)*)|('.+'))@(${JSON.parse(
            process.env.VUE_APP_ALLOWED_REGISTER_UNIVERSITIES
          ).join("|")})$`
        ).test(v) || "Invalid email address",
    ],
  }),

  methods: {
    resetPassword() {
      this.message = null;

      if (this.$refs.form.validate()) {
        this.$store
          .dispatch("resetUserPasswordAction", {
            email: this.email,
          })
          .then((response) => {
            this.message = response;
          });
      }
    },
  },
};
</script>

<style scoped>
.fluid {
  margin: 0;
  padding: 0;
}
</style>