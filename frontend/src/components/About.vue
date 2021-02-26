<template>
  <v-container>
    <h1 class="display-2 font-weight-bold my-3">About</h1>
    <h2 class="subheading font-weight-regular">
      Chatbridge connects you instantly to anonymous one-to-one video chats with
      other Cambridge students.
    </h2>
    <hr class="my-5" />
    <h3>Why does Chatbridge exist?</h3>
    <p>
      The pandemic has stopped us all from meeting and socialising with new
      people. No longer can you bump into your future best friend during
      lectures; no longer can you catch the eye of your future romance at
      Mainsbury's. Chatbridge is here to (virtually) bring that back and to help
      you encounter some more of the 20,000 students at our university.
    </p>
    <h3>How does it work?</h3>
    <p>It's really simple!</p>
    <ul>
      <li>Login via Raven to prove you're a member of the University.</li>
      <li>
        When you click 'Find me someone', we'll connect you to a video chat with
        another online user. Depending on how many other people are online, this
        can take anything from less than a second to a few minutes.
      </li>
      <li>
        The chats are completely anonymous - no names or IDs are shared. We
        instead assign you randomly generated names. (Yes, we know they're
        pretty terrible at the moment. A fix is top priority.)
      </li>
      <li>
        You can chat for as long as you like. End the chat by hitting
        'Disconnect', or end the chat and immediately search for a new person by
        hitting 'Find me someone' again.
      </li>
    </ul>
    <p></p>
    <p>
      You can block a user for any reason by clicking 'Block/Report' and
      completing the form. Blocking a user means you will never be connected to
      them again. And while we hope this never happens, if you come across
      anyone breaking the
      <router-link to="/rules">Community Rules</router-link>, please report them
      as well. This will help us keep bad users off the website. You can still
      block or report a user even if the chat has ended.
    </p>
    <h3>Is it secure?</h3>
    <p>
      Yes. All sessions are encrypted. None of your chat activity on Chatbridge
      is recorded or stored, other than (for obvious reasons) the list of users
      you block or report.
    </p>
    <h3>Who can use Chatbridge?</h3>
    <p>
      Anyone with a Raven login and a laptop/desktop/tablet/mobile. We're
      working on a way of limiting users to students only.
    </p>
    <h3>What about other universities?</h3>
    <p>
      Chatbridge support for students at other universities is on the way. Come
      back soon.
    </p>
    <h3>Who is Chatbridge run by?</h3>
    <p>
      Built and currently run by an engineering student at Churchill College who
      is now laughably behind on lectures.
    </p>
    <h3>Can I contribute?</h3>
    <p>
      Yes! There are plenty of features still to add and improvements still to
      make. Please get in touch at
      <a href="mailto:admin@chatbridge.live">admin@chatbridge.live</a>.
    </p>
    <h3>I have a suggestion/problem/other query.</h3>
    <p>
      Please get in touch at
      <a href="mailto:admin@chatbridge.live">admin@chatbridge.live</a>.
    </p>
    <hr class="my-5" />
    <h3>Credits</h3>
    <p>
      Logo icon by
      <a target="_blank" href="https://icon54.com/" title="Pixel perfect"
        >Pixel perfect</a
      >
      from
      <a target="_blank" href="https://www.flaticon.com/" title="Flaticon"
        >www.flaticon.com</a
      >.
    </p>
  </v-container>
</template>

<script>
export default {
  name: "About",
};
</script>

<style scoped>
</style>