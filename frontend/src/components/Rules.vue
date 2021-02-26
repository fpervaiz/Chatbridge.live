<template>
  <v-container>
    <v-row justify="center" align="center">
      <v-col justify="center" cols="10" md="6" class="justify-content">
        <h2 class="my-3">Community Rules</h2>
        <p>
          Here's a quick reminder of our rules for using Chatbridge. Please
          report anyone you find violating these rules.
        </p>

        <ol>
          <li>
            <h4>Be nice to each other.</h4>
            <p class="text--secondary">
              Be kind, respectful and polite, just like you would in real life.
              Spread the love.
            </p>
          </li>

          <li>
            <h4>
              No racism, sexism, bullying, harassment, homophobia, violence or
              any form of hate.
            </h4>
            <p class="text--secondary">None of that is welcome here.</p>
          </li>

          <li>
            <h4>NSFW behaviour and content is strictly prohibited.</h4>
            <p class="text--secondary">Keep it clean.</p>
          </li>

          <li>
            <h4>Don't do anything illegal.</h4>
            <p class="text--secondary">
              Hopefully this one goes without saying.
            </p>
          </li>

          <li>
            <h4>Respect each others' privacy.</h4>
            <p class="text--secondary">
              No one has any obligation to reveal their identity. Don't
              screenshot or record anyone without asking first.
            </p>
          </li>
        </ol>
        <p class="my-5">
          Thank you for helping keep Chatbridge safe and fun for everyone!
        </p>
        <div class="my-5 text-center">
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
export default {
  name: "Rules",
};
</script>

<style scoped>
</style>