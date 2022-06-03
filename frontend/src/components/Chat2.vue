<template>
  <div class="main text-center pa-0">
    <div class="logoContainer">
      <v-img
        class="mb-5"
        src="@/assets/logo.svg"
        max-height="128px"
        contain
      ></v-img>
    </div>

    <div class="profileBtnContainer">
      <v-tooltip right
        ><template v-slot:activator="{ on }"
          ><div v-on="on">
            <v-btn fab elevation="1" v-on="on"
              ><v-icon dark> mdi-account </v-icon></v-btn
            >
          </div></template
        ><span>Logged in as {{ userIdentity }}</span></v-tooltip
      >
    </div>

    <div class="fscBtnContainer">
      <v-tooltip bottom
        ><template v-slot:activator="{ on }"
          ><div v-on="on">
            <v-btn fab elevation="1" v-on="on" @click="toggleFullScreen"
              ><v-icon dark> mdi-fullscreen </v-icon></v-btn
            >
          </div></template
        ><span>Toggle fullscreen</span></v-tooltip
      >
    </div>

    <div v-if="peerCamStream" class="peerCamContainer">
      <video
        id="peerCam"
        autoplay="true"
        playsinline
        :src-object.prop.camel="peerCamStream"
      ></video>
    </div>

    <div v-else style="display: inline-block">
      <h1>{{ peerStatusHeading }}</h1>
      <h2 class="font-weight-regular">{{ peerStatusMessage }}</h2>
    </div>

    <div v-if="userCamStream" class="userCamContainer">
      <video
        class="camVideo"
        autoplay="true"
        playsinline
        id="userCam"
        muted="muted"
        :src-object.prop.camel="userCamStream"
      ></video>
    </div>

    <div class="actionButtonContainer">
      <v-tooltip top
        ><template v-slot:activator="{ on }"
          ><div v-on="on" style="float: left">
            <v-btn
              fab
              elevation="1"
              x-large
              class="mx-3"
              v-on="on"
              @click="toggleChat"
              ><v-icon dark> mdi-chat </v-icon></v-btn
            >
          </div></template
        ><span>Chat</span></v-tooltip
      >
      <v-tooltip top
        ><template v-slot:activator="{ on }"
          ><div v-on="on" style="float: left">
            <v-btn
              fab
              elevation="1"
              x-large
              class="mx-3"
              @click="search"
              :disabled="!enableSearch"
              v-on="on"
              ><v-icon dark> mdi-account-search </v-icon></v-btn
            >
          </div></template
        ><span>Find me someone</span></v-tooltip
      >
      <v-tooltip top>
        <template v-slot:activator="{ on }"
          ><div v-on="on" style="float: left">
            <v-btn
              fab
              :light="micMuted"
              elevation="1"
              x-large
              class="mx-3"
              @click="toggleMic()"
              v-on="on"
              :disabled="enableMuteMic"
              ><v-icon dark> mdi-microphone-off </v-icon></v-btn
            >
          </div></template
        ><span v-if="micMuted">Unmute mic</span
        ><span v-else>Mute mic</span></v-tooltip
      >
      <v-tooltip top>
        <template v-slot:activator="{ on }"
          ><div v-on="on" style="float: left">
            <v-btn
              fab
              elevation="1"
              x-large
              class="mx-3"
              @click="closePeerConnection(true)"
              :disabled="!userConnected"
              v-on="on"
              ><v-icon dark> mdi-phone-hangup </v-icon></v-btn
            >
          </div></template
        ><span>Disconnect</span></v-tooltip
      >
      <v-tooltip top>
        <template v-slot:activator="{ on }"
          ><div v-on="on" style="float: left">
            <v-btn
              fab
              elevation="1"
              x-large
              class="mx-3"
              color="error"
              @click="
                () => {
                  userConnected
                    ? (blockConfirmDialog = true)
                    : blockReportPeer();
                }
              "
              :disabled="!enableBlock"
              v-on="on"
              ><v-icon dark> mdi-cancel </v-icon>
            </v-btn>
          </div></template
        >
        <span
          >Block/report <template v-if="userConnected">this</template
          ><template v-else>last</template> user</span
        >
      </v-tooltip>
    </div>

    <div class="statsContainer" v-if="queueStats">
      <span class="dot-green mr-2"></span>
      <span class="font-weight-regular text--secondary">
        {{ queueStats.online }}
        online now ({{ queueStats.chatting }} chatting,
        {{ queueStats.searching }} searching)</span
      >
    </div>

    <v-card id="chatContainer">
      <v-card-title>Chat</v-card-title>
      <div v-if="eventBanner" class="eventBanner px-2">
        <p>
          📢
          <a
            class="eventBannerLink font-weight-bold"
            target="_blank"
            :href="eventBanner.link"
            >{{ eventBanner.name }}</a
          >
          -
          <template v-if="new Date(eventBanner.start_time) > new Date()">
            <vue-countdown
              :time="new Date(eventBanner.start_time) - Date.now()"
              v-slot="{ days, hours, minutes, seconds }"
              :emit-events="false"
            >
              starts in {{ days }} days, {{ hours }} hours,
              {{ minutes }} minutes, {{ seconds }} seconds
            </vue-countdown>
          </template>
          <template v-else>live now!</template>
        </p>
      </div>
      <div id="chatArea">
        <template v-for="(message, i) in chatMessages">
          <p v-if="message.sender === '_STATUS_GREEN'" :key="i">
            <span class="font-weight-regular text--secondary">{{
              message.time
            }}</span
            ><strong style="color: green">{{ message.text }}</strong>
          </p>
          <p v-else-if="message.sender === '_STATUS_RED'" :key="i">
            <span class="font-weight-regular text--secondary">{{
              message.time
            }}</span
            ><strong style="color: red">{{ message.text }}</strong>
          </p>
          <p v-else :key="i">
            <span class="font-weight-regular text--secondary">{{
              message.time
            }}</span
            ><strong>{{ message.sender }}: </strong>
            <span v-html="message.html"></span>
          </p>
        </template>
      </div>
      <v-text-field
        class="px-1"
        label="Type a message..."
        v-model="chatMessageInput"
        :append-outer-icon="'mdi-send'"
        @click:append-outer="sendChatMessage"
        v-on:keyup.enter="sendChatMessage"
        hide-details
        solo
      ></v-text-field>
    </v-card>

    <v-overlay v-if="showWsOverlay">
      <v-alert v-if="wsConnectionError" type="error">{{
        this.wsConnectionError
      }}</v-alert>
      <v-alert v-else>
        <v-progress-circular
          class="mr-5"
          indeterminate
          color="primary"
        ></v-progress-circular
        >Please wait...</v-alert
      >
    </v-overlay>
    <v-dialog v-model="blockConfirmDialog" persistent max-width="576">
      <v-card>
        <v-card-title class="headline"> Are you sure? </v-card-title>
        <v-card-text
          >You'll immediately be disconnected from this user.</v-card-text
        >
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="blockConfirmDialog = false">
            No
          </v-btn>
          <v-btn color="error" text @click="blockReportPeer()"> Yes </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="blockReportDialog" persistent max-width="576">
      <v-card>
        <v-card-title class="headline">
          Block/Report "{{ this.toBlockFriendlyName }}"
        </v-card-title>
        <v-card-text>
          <v-form ref="blockReportForm" lazy-validation>
            <v-checkbox v-model="blockReportFormData.toBlock"
              ><template v-slot:label
                ><v-col
                  ><h3>Block this user</h3>
                  <p>You will never be matched with this user again.</p></v-col
                ></template
              ></v-checkbox
            >
            <v-checkbox v-model="blockReportFormData.toReport"
              ><template v-slot:label
                ><v-col
                  ><h3>Report this user</h3>
                  <p>
                    Please enter your reasons for reporting this user below.
                  </p></v-col
                ></template
              ></v-checkbox
            >
            <v-textarea
              v-model="blockReportFormData.reportReason"
              label="Why would you like to report this user?"
              placeholder="(e.g. inappropriate behaviour, camera turned off, not a student etc.)"
              :required="blockReportFormData.toReport"
              :disabled="!blockReportFormData.toReport"
              :rules="blockReportFormData.toReport ? reasonRules : []"
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="blockReportDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :disabled="
              !(
                blockReportFormData.toBlock ||
                (blockReportFormData.toReport &&
                  blockReportFormData.reportReason)
              )
            "
            text
            @click="submitForm"
          >
            Submit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import io from "socket.io-client";
import Peer from "simple-peer";
import Autolinker from "autolinker";
import firebase from "firebase/app";
import "firebase/remote-config";
import VueCountdown from "@chenfengyuan/vue-countdown";
import { format } from "date-fns";
import utils from "@/utils";

//import RuleList from "./RuleList";

const appStates = {
  WS_CONNECTING: 1,
  STARTING: 2,
  READY: 3,
  SEARCHING: 4,
  CONNECTING: 5,
  CONNECTED: 6,
  DISCONNECTED: 7,
  DISCONNECTED_INITIATOR: 8,
  DISCONNECTED_ERROR: 9,
  WS_ERROR: 10,
  ERROR: 11,
};

export default {
  name: "Chat",

  components: { VueCountdown },

  data() {
    return {
      remoteConfig: null,
      eventBanner: null,

      appState: appStates.WS_CONNECTING,

      matchingSocket: null,
      signalingSocket: null,

      queueStats: null,

      localPeer: null,

      localPeerFriendlyName: null,
      remotePeerFriendlyName: null,

      userCamStream: null,
      peerCamStream: null,

      micMuted: false,

      chatMessages: [],
      chatMessageInput: "",
      chatContainer: null,
      chatArea: null,
      chatOpen: false,

      blockConfirmDialog: false,
      blockReportDialog: false,

      blockReportFormData: {
        toBlock: false,
        toReport: false,
        reportReason: null,
      },
      reasonRules: [
        (v) =>
          (v && v.length >= 10) ||
          "Reason must be at least 10 characters in length.",
      ],

      toBlockPeerId: null,
      toBlockFriendlyName: null,

      wsConnected: false,
      wsConnectionError: "",

      peerId: null,

      autolinker: new Autolinker(),
    };
  },

  created() {
    this.remoteConfig = firebase.remoteConfig();
    this.remoteConfig.settings.minimumFetchIntervalMillis = 600000;

    this.remoteConfig
      .fetchAndActivate()
      .then(() => {
        let eventBannerJson = this.remoteConfig.getValue("event_banner")._value;
        if (eventBannerJson) {
          const eventBanner = JSON.parse(eventBannerJson);
          if (eventBanner.end_time > Date.now()) {
            this.eventBanner = eventBanner;
          }
        }
      })
      .catch((err) => console.log(err));
  },

  computed: {
    userIdentity() {
      let email = this.$store.getters.getUserEmail;
      let university = utils.domainToUniversityName(email.split("@")[1]);

      if (university) {
        return `${email} (${university})`;
      } else {
        return email;
      }
    },

    enableMuteMic() {
      return !this.appState === appStates.STARTING;
    },

    enableSearch() {
      return (
        this.appState === appStates.READY ||
        this.appState === appStates.CONNECTED ||
        this.appState === appStates.DISCONNECTED ||
        this.appState === appStates.DISCONNECTED_INITIATOR ||
        this.appState === appStates.DISCONNECTED_ERROR
      );
    },

    showWsOverlay() {
      return (
        this.appState === appStates.WS_CONNECTING ||
        this.appState === appStates.WS_ERROR
      );
    },

    enableBlock() {
      return (
        this.appState === appStates.CONNECTED ||
        this.appState === appStates.DISCONNECTED ||
        this.appState === appStates.DISCONNECTED_INITIATOR ||
        this.appState === appStates.DISCONNECTED_ERROR
      );
    },

    showLocalName() {
      if (this.appState === appStates.CONNECTED) {
        return this.localPeerFriendlyName;
      } else {
        return false;
      }
    },

    showRemoteName() {
      if (this.appState === appStates.CONNECTED) {
        return this.remotePeerFriendlyName;
      } else {
        return false;
      }
    },

    userConnected() {
      return this.appState === appStates.CONNECTED;
    },

    showPeerStream() {
      return this.appState === appStates.CONNECTED && this.peerCamStream;
    },

    peerStatusHeading() {
      switch (this.appState) {
        case appStates.STARTING: {
          return "No webcam found!";
        }
        case appStates.READY: {
          return "Paused.";
        }
        case appStates.SEARCHING: {
          return "Searching...";
        }
        case appStates.CONNECTING: {
          return "Connecting...";
        }
        case appStates.DISCONNECTED: {
          return "Disconnected.";
        }
        case appStates.DISCONNECTED_INITIATOR: {
          return "Disconnected.";
        }
        case appStates.DISCONNECTED_ERROR: {
          return "Disconnected.";
        }
        default: {
          return null;
        }
      }
    },

    peerStatusMessage() {
      switch (this.appState) {
        case appStates.STARTING: {
          return "Connect one or allow access.";
        }
        case appStates.READY: {
          return "Hit 'Find me someone' to get going.";
        }
        case appStates.SEARCHING: {
          return "Finding you someone...";
        }
        case appStates.CONNECTING: {
          return "Get ready!";
        }
        case appStates.DISCONNECTED: {
          return "The other person has left the chat.";
        }
        case appStates.DISCONNECTED_INITIATOR: {
          return "You left the chat.";
        }
        case appStates.DISCONNECTED_ERROR: {
          return "Connection failed. Sorry about that.";
        }
        default: {
          return null;
        }
      }
    },

    peerWidth() {
      return this.peerCamShrink ? "50%" : "100%";
    },

    userWidth() {
      return this.userCamShrink ? "50%" : "100%";
    },
  },

  methods: {
    search() {
      if (this.appState === appStates.CONNECTED) {
        this.closePeerConnection(true);
      }

      if (this.userCamStream && this.appState !== appStates.WS_ERROR) {
        this.remotePeerFriendlyName = null;
        this.peerId = null;

        this.matchingSocket.emit("search");
        this.$analytics.logEvent("chat_app_search");
        this.appState = appStates.SEARCHING;
      }
    },

    sendChatMessage() {
      if (this.chatMessageInput.length > 0) {
        if (this.appState === appStates.CONNECTED) {
          const chatMessage = {
            type: "chatMessage",
            chatMessage: {
              sender: this.localPeerFriendlyName,
              text: this.chatMessageInput,
            },
          };
          this.localPeer.send(JSON.stringify(chatMessage));
          this.addChatMessage(chatMessage.chatMessage);
          this.chatMessageInput = "";
        } else {
          this.addChatMessage({
            sender: "_STATUS_RED",
            text: "You aren't connected to anyone",
          });
        }
      }
    },

    blockReportPeer() {
      this.toBlockPeerId = this.peerId;
      this.toBlockFriendlyName = this.remotePeerFriendlyName;

      this.blockConfirmDialog = false;
      if (this.appState === appStates.CONNECTED) {
        this.closePeerConnection(true);
      }

      this.blockReportDialog = true;
    },

    submitForm() {
      if (this.$refs.blockReportForm.validate()) {
        this.matchingSocket.emit(
          "block_report",
          { peerId: this.toBlockPeerId, formData: this.blockReportFormData },
          (response) => {
            this.blockReportDialog = false;
            switch (response.status) {
              case "ok": {
                this.$refs.blockReportForm.reset();
                this.$analytics.logEvent("chat_app_block_report_success");
                this.addChatMessage({
                  sender: "_STATUS_GREEN",
                  text:
                    "Successfully blocked/reported " + this.toBlockFriendlyName,
                });
                break;
              }
              case "error": {
                this.$analytics.logEvent("chat_app_block_report_fail");
                this.addChatMessage({
                  sender: "_STATUS_RED",
                  text: "Failed to block/report. Please try again.",
                });
                break;
              }
            }
          }
        );
      }
    },

    addChatMessage(chatMessage) {
      chatMessage.html = this.autolinker.link(chatMessage.text);
      const time = format(new Date(), "HH:mm");
      chatMessage.time = `${time} `;
      this.chatMessages.push(chatMessage);
      setTimeout(
        () => (this.chatArea.scrollTop = this.chatArea.scrollHeight),
        100
      );

      if (!this.chatOpen) {
        this.toggleChat();
      }
    },

    closePeerConnection(isInitiator) {
      this.$analytics.logEvent("chat_app_peer_close");

      if (isInitiator) {
        this.matchingSocket.emit("disconnect_peer");
      }

      this.localPeer.destroy();

      this.addChatMessage({
        sender: "_STATUS_RED",
        text: "Disconnected from " + this.remotePeerFriendlyName,
      });

      this.peerCamStream = null;
      this.localPeer = null;

      if (this.wsConnectionError) {
        this.appState = appStates.WS_ERROR;
      } else {
        this.appState = isInitiator
          ? appStates.DISCONNECTED_INITIATOR
          : appStates.DISCONNECTED;
      }
    },

    handlePeerError() {
      this.matchingSocket.emit("handle_peer_error");
      if (this.localPeer && !this.localPeer.destroyed) {
        this.localPeer.destroy();
      }
      this.peerCamStream = null;
      this.localPeer = null;

      this.appState = this.wsConnectionError
        ? appStates.WS_ERROR
        : appStates.DISCONNECTED_ERROR;
    },

    onHardClose() {
      if (this.appState === appStates.CONNECTED) {
        this.closePeerConnection(true);
      }

      if (this.wsConnected) {
        this.matchingSocket.disconnect();
      }
    },

    togglePeerShrink() {
      this.peerCamShrink = !this.peerCamShrink;
    },

    toggleUserShrink() {
      this.userCamShrink = !this.userCamShrink;
    },

    toggleChat() {
      this.chatContainer.classList.toggle("open");
      this.chatOpen = !this.chatOpen;
    },

    toggleMic() {
      this.micMuted = !this.micMuted;
      this.userCamStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    },

    toggleFullScreen() {
      if (
        (document.fullScreenElement && document.fullScreenElement !== null) ||
        (!document.mozFullScreen && !document.webkitIsFullScreen)
      ) {
        if (document.documentElement.requestFullScreen) {
          document.documentElement.requestFullScreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullScreen) {
          document.documentElement.webkitRequestFullScreen(
            Element.ALLOW_KEYBOARD_INPUT
          );
        }
      } else {
        if (document.cancelFullScreen) {
          document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        }
      }
    },
  },

  mounted() {
    window.onbeforeunload = () => {
      return "";
    };

    var self = this;

    this.$analytics.logEvent("chat_app_start");

    this.chatContainer = document.getElementById("chatContainer");
    this.chatArea = document.getElementById("chatArea");

    self.$store
      .dispatch("getAuthIdTokenAction")
      .catch(() => {
        self.$store.dispatch("logoutUserAction").then(() => {
          this.$analytics.logEvent("logout");
          this.$router.replace("/raven");
        });
      })
      .then((idToken) => {
        self.matchingSocket = io(self.$store.state.backendUrl, {
          transports: ["websocket"],
          reconnectionAttempts: 5,
          auth: {
            idToken: idToken,
          },
        });

        self.matchingSocket.on("connect", () => {
          document.addEventListener("beforeunload", this.onHardClose);
          self.appState = appStates.STARTING;
          self.wsConnected = true;
          self.wsConnectionError = "";

          if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
              .getUserMedia({
                video: { facingMode: "user", width: 1280, height: 720 },
                audio: true,
              })
              .then(function (stream) {
                self.userCamStream = stream;
                self.$analytics.logEvent("chat_app_ready");
                self.appState = appStates.READY;

                self.addChatMessage({
                  sender: "_STATUS_GREEN",
                  text: `Hi ${self.$store.getters.getUserEmail}!`,
                });
              })
              .catch(function (error) {
                console.log(error);
                self.appState = appStates.ERROR;
              });
          }

          self.matchingSocket.on("connect_peer", (data) => {
            self.$analytics.logEvent("chat_app_peer_match");
            self.appState = appStates.CONNECTING;
            self.peerId = data.peerId;
            self.localPeerFriendlyName = data.localFriendlyName;
            self.remotePeerFriendlyName = data.peerFriendlyName;

            self.localPeer = new Peer({
              initiator: data.isInitiator,
              stream: this.userCamStream,
              config: {
                iceServers: [
                  {
                    urls: JSON.parse(process.env.VUE_APP_STUN_SERVERS),
                  },
                  {
                    urls: process.env.VUE_APP_TURN_SERVER,
                    username: data.turnCreds.username,
                    credential: data.turnCreds.password,
                  },
                ],
                sdpSemantics: "unified-plan",
              },
            });

            self.peerConnectTimeout = setTimeout(() => {
              if (this.appState !== appStates.CONNECTED) {
                this.handlePeerError();
              }
            }, 15000);

            self.localPeer.on("signal", (signalData) => {
              self.matchingSocket.emit("signal", {
                signalData: signalData,
              });
            });

            self.localPeer.on("connect", () => {
              clearTimeout(this.peerConnectTimeout);
              this.$analytics.logEvent("chat_app_peer_connected");
              this.appState = appStates.CONNECTED;
              this.addChatMessage({
                sender: "_STATUS_GREEN",
                text: "Connected to " + this.remotePeerFriendlyName,
              });
            });

            self.localPeer.on("stream", (stream) => {
              this.peerCamStream = stream;
            });

            self.localPeer.on("data", (data) => {
              const msg = JSON.parse(data);
              if (msg.type === "chatMessage") {
                self.addChatMessage(msg.chatMessage);
              }
            });

            self.localPeer.on("error", (err) => {
              self.$analytics.logEvent("chat_app_peer_error");
              console.log(err);
              self.handlePeerError();
            });
          });

          self.matchingSocket.on("signal", (data) => {
            self.localPeer.signal(data.signalData);
          });

          self.matchingSocket.on("disconnect_peer", () => {
            this.closePeerConnection(false);
          });

          // Peer destroy and close event seem unreliable,
          // so implement our own closing mechanism until the
          // cause is found.
          // self.localPeer.on("close", () => {
          //   this.closePeerConnection();
          // });
        });

        self.matchingSocket.on("queue_stats", (stats) => {
          this.queueStats = stats;
        });

        self.matchingSocket.on("force_logout", () => {
          this.$store.dispatch("logoutUserAction").then(() => {
            this.$analytics.logEvent("logout");
            this.$router.replace("/");
          });
        });

        self.matchingSocket.on("connect_error", (error) => {
          self.$analytics.logEvent("chat_app_ws_error");
          if (self.appState !== appStates.CONNECTED) {
            self.appState = appStates.WS_ERROR;
          }
          self.wsConnected = false;
          switch (error.message) {
            case "unauthorised": {
              this.wsConnectionError =
                "Authentication error. Please try again later.";
              break;
            }
            case "already_connected": {
              this.wsConnectionError =
                "You have Chatbridge open in another tab. Please close it and try again.";
              break;
            }
            default:
              this.wsConnectionError =
                "There's an issue on our end. Please try again later.";
          }
          this.matchingSocket.removeAllListeners();
        });
      });
  },

  beforeDestroy() {
    if (this.appState == appStates.CONNECTED) {
      this.closePeerConnection();
    }

    if (this.userCamStream) {
      this.userCamStream.getTracks().forEach((track) => track.stop());
    }

    if (this.wsConnected) {
      this.matchingSocket.disconnect();
      this.matchingSocket.removeAllListeners();
      this.wsConnected = false;
    }

    window.onbeforeunload = null;
    document.removeEventListener("beforeunload", this.onHardClose);
    this.$analytics.logEvent("chat_app_exited");
  },
};
</script>

<style scoped>
.main {
  width: 100%;
  margin: 0 auto;
}

.logoContainer {
  position: absolute;
  height: 64px;
  margin: 0 auto;
  top: 0;
  left: 0;
  right: 0;
}

.profileBtnContainer {
  position: absolute;
  top: 2%;
  left: 2%;
  z-index: 1;
}

.fscBtnContainer {
  position: absolute;
  top: 2%;
  right: 2%;
  z-index: 1;
}

.actionButtonContainer {
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
}

.camVideo {
  -webkit-transition: width 300ms ease-in-out, height 300ms ease-in-out;
  -moz-transition: width 300ms ease-in-out, height 300ms ease-in-out;
  -o-transition: width 300ms ease-in-out, height 300ms ease-in-out;
  transition: width 300ms ease-in-out, height 300ms ease-in-out;
}

.userCamContainer {
  position: absolute;
  bottom: 2%;
  right: 2%;
  max-width: 300px;
  overflow: hidden;
  outline: 2px solid white;
  line-height: 0;
  /* border-radius */
  -webkit-border-radius: 4px;
  -moz-border-radius: 4px;
  border-radius: 4px;
  /* box-shadow */
  -webkit-box-shadow: rgba(0, 0, 0, 0.8) 0px 0 10px;
  -moz-box-shadow: rgba(0, 0, 0, 0.8) 0 0 10px;
  box-shadow: rgba(0, 0, 0, 0.8) 0 0 10px;
}

.peerCamContainer {
  overflow: hidden;
  line-height: 0;
}

.statsContainer {
  position: absolute;
  bottom: 5px;
  width: 100vw;
  z-index: 1;
}

#userCam {
  -webkit-transform: scaleX(-1);
  transform: scaleX(-1);
  max-width: 300px;
}

#peerCam {
  height: 100vh;
  max-width: 100vw;
  line-height: 0;
  object-fit: cover;
}

#chatContainer {
  position: absolute;
  top: 20%;
  transform: translateX(-100%);
  transition: transform ease-out 0.3s;
}

#chatContainer.open {
  transform: translateX(0);
}

.eventBanner {
  width: 350px;
  background-color: crimson;
}

.eventBannerLink {
  text-decoration: underline;
  color: white;
}

#chatArea {
  width: 350px;
  height: 50vh;
  overflow-y: auto;
  text-align: left;
  padding-left: 15px;
  padding-right: 15px;
  padding-top: 5px;
  padding-bottom: 5px;
  background-color: black;
}

.dot-green {
  height: 10px;
  width: 10px;
  background-color: green;
  border-radius: 50%;
  display: inline-block;
}
</style>