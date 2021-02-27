<template>
  <v-container>
    <v-row justify="center" align="center">
      <v-col justify="center" cols="10" md="6" class="justify-content">
        <h2 class="my-3">Community Rules</h2>
        <p>
          Here's a quick reminder of our rules for using Chatbridge. Please
          report anyone you find violating these rules.
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

export default {
  name: "Rules",

  components: { RuleList },
};
</script>

<style scoped>
</style>