<template>
  <v-container>
    <v-row justify="center" align="center">
      <v-col justify="center" cols="10" md="6" class="justify-content">
        <Logo />

        <h2 class="my-3">Community Rules</h2>
        <p>
          Here's a quick reminder of our rules for using Chatbridge. Please
          report anyone you find violating these rules. If you have screenshots
          or other evidence of rule-breaking, please send these to us at
          <a href="mailto:admin@chatbridge.live">admin@chatbridge.live</a>.
        </p>
        <RuleList />
        <div class="my-2 text-center">
          <v-btn to="/chat" class="mx-2" color="primary">Continue</v-btn>
          <v-btn @click="$router.go(-1)" class="mx-2" color="secondary"
            >Go back</v-btn
          >
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import RuleList from "./RuleList";
import Logo from "./Logo";

export default {
  name: "Rules",

  components: { RuleList, Logo },
};
</script>

<style scoped>
</style>