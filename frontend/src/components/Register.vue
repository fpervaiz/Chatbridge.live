<template>
  <v-container fluid class="fluid">
    <v-row justify="center" align="center" class="text-center"
      ><v-col> <Logo /> </v-col
    ></v-row>

    <v-row justify="center" align="center" class="my-5">
      <v-col cols="10" md="6" class="text-center">
        <h1>Sign Up</h1>
        <p>Please complete this form to create an account.</p>
        <v-alert v-if="message" class="my-5" dense :type="message.type">
          {{ message.text }}
        </v-alert>
        <v-form ref="form" class="mx-2" lazy-validation>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="email"
                :rules="emailRules"
                label="University Email Address"
                required
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row class="mt-n6">
            <v-col cols="6">
              <v-text-field
                v-model="password"
                type="password"
                :rules="passwordRules"
                label="Password"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="confirmPassword"
                :rules="[passwordMatch]"
                type="password"
                label="Confirm Password"
                required
              ></v-text-field>
            </v-col>
          </v-row>

          <!--
          <v-checkbox
            v-model="firstcheckbox"
            :rules="[(v) => !!v || 'You must agree to continue!']"
            label="I agree with the Terms of Use"
            required
          ></v-checkbox>
          -->

          <v-row justify="center" align="center" class="my-3">
            <vue-recaptcha
              ref="recaptcha"
              :sitekey="recaptchaKey"
              :loadRecaptchaScript="true"
              @verify="onRecaptchaVerify"
              @expired="onRecaptchaExpired"
            ></vue-recaptcha>
          </v-row>

          <v-btn
            color="primary"
            class="my-5"
            :disabled="submitDisable"
            @click="submitForm"
          >
            Register
          </v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import VueRecaptcha from "vue-recaptcha";

import Logo from "./Logo";

export default {
  name: "RegisterForm",

  created() {
    let allowRegisterDomains = ["chatbridge.live"];
    // eslint-disable-next-line
    let exp = `^(([^<>()[\\]\\.,;:\s@']+(\.[^<>()\\[\]\\.,;:\s@']+)*)|('.+'))@(${allowRegisterDomains.join(
      "|"
    )})$`;
    this.emailRules.push(
      (v) => new RegExp(exp).test(v) || "Invalid email address"
    );
  },

  components: { VueRecaptcha, Logo },

  computed: {
    passwordMatch() {
      return () =>
        this.password === this.confirmPassword || "Passwords do not match";
    },
  },

  data: () => ({
    remoteConfig: null,

    recaptchaKey: "6Lcg3TMaAAAAACxa6pIya8mZ4SLJ8bpGN-OxBXFM",
    recaptchaVerified: false,
    recaptchaToken: "",

    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",

    submitDisable: true,

    message: null,

    nameRules: [
      (v) => !!v || "Name is required",
      (v) => (v && v.length <= 10) || "Name must be less than 10 characters",
    ],
    emailRules: [(v) => !!v || "Email address is required"],
    /*
    passwordRules: [
      (v) => !!v || "Password is required",
      (v) =>
        /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/.test(v) ||
        "Password must contain at least one lowercase letter, one uppercase letter, one number and at least one special character.",
    ],
    */
    passwordRules: [
      (v) => !!v || "Password is required",
      (v) =>
        (v && v.length >= 8) ||
        "Password must be at least 8 characters in length.",
    ],
    firstcheckbox: false,
    seccheckbox: false,
  }),

  methods: {
    onRecaptchaVerify(recaptchaToken) {
      this.recaptchaVerified = true;
      this.submitDisable = false;
      this.recaptchaToken = recaptchaToken;
    },

    onRecaptchaExpired() {
      this.recaptchaVerified = false;
      this.submitDisable = true;
    },

    submitForm() {
      this.message = null;
      if (this.$refs.form.validate() && this.recaptchaVerified) {
        this.submitDisable = true;
        this.$store
          .dispatch("registerUserAction", {
            email: this.email,
            password: this.password,
            recaptchaToken: this.recaptchaToken,
          })
          .then((response) => {
            this.message = response;
          })
          .catch((error) => {
            this.message = error;
            this.submitDisable = false;
            this.$refs.recaptcha.reset();
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