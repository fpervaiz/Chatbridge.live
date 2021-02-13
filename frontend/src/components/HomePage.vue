<template>
  <v-container>
    <v-row class="mt-5 text-center">
      <v-col class="mb-4">
        <h1 class="display-2 font-weight-bold mb-3">
          Chat anonymously with Cambridge students.
        </h1>

        <h2 class="subheading font-weight-regular">Simple, safe, secure.</h2>
        <hr class="my-5" />
        <p>
          Only verified University of Cambridge students can use Chatbridge.
        </p>
        <v-btn to="/chat" class="mx-2" color="primary">Start chatting</v-btn>
        <v-btn to="/about" class="mx-2" color="secondary">Tell me more</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "HomePage",
};
</script>

<style scoped>
</style>