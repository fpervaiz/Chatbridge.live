<template>
  <v-app>
    <NavBar />
    <v-main>
      <transition name="slide" mode="out-in">
        <router-view />
      </transition>
    </v-main>
    <Footer />
  </v-app>
</template>

<script>
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

export default {
  name: "App",

  components: {
    NavBar,
    Footer,
  },

  data: () => ({
    //
  }),
};
</script>

<style>
@font-face {
  font-family: "a Affirmation";
  src: local("a Affirmation"),
    url(assets/fonts/aAffirmation.otf) format("opentype");
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.slide-enter,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30%);
}
</style>
