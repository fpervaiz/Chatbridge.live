<template>
  <v-container>
    <v-row class="mt-5 text-center">
      <v-col class="mb-4">
        <h1 class="display-2 font-weight-bold mb-3">
          Chat anonymously with other Cambridge students.
        </h1>

        <h2 class="subheading font-weight-regular">{{ subtitle }}</h2>
        <hr class="my-5" />
        <p>You must be a University of Cambridge student to use Chatbridge.</p>
        <v-btn to="/rules" class="mx-2" color="primary">Start chatting</v-btn>
        <v-btn to="/about" class="mx-2" color="secondary">Tell me more</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "HomePage",

  data() {
    return {
      subtitles: [
        "Rumour has it Stephen Toope is on here.",
        "Find the one you've been looking for.",
        "Scientifically proven to be more fun than binging lectures.",
        "Isn't the name clever?",
        "Ain't no pandemic large enough.",
      ],
      subtitle: null,
    };
  },

  created() {
    this.subtitle = this.subtitles[
      Math.floor(Math.random() * this.subtitles.length)
    ];
  },
};
</script>

<style scoped>
</style>