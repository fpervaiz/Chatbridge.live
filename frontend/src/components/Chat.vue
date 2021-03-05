<template>
  <v-container fluid class="my-2">
    <v-row class="p-3">
      <v-col class="col-xs">
        <h4>
          Who?<span v-if="showRemoteName"> ({{ showRemoteName }})</span>
          <span v-if="peerCamStream">
            <v-btn icon>
              <v-icon @click="togglePeerShrink()" v-if="peerCamShrink"
                >mdi-fullscreen</v-icon
              >
              <v-icon @click="togglePeerShrink()" v-else
                >mdi-fullscreen-exit</v-icon
              >
            </v-btn></span
          >
        </h4>
        <div v-if="!showPeerStream">
          <h2>{{ peerStatusHeading }}</h2>
          <p>{{ peerStatusMessage }}</p>
        </div>
        <video
          class="camVideo"
          v-if="peerCamStream"
          :width="peerWidth"
          height="auto"
          autoplay="true"
          playsinline
          id="peerCam"
          :src-object.prop.camel="peerCamStream"
        ></video>

        <h4>
          You<span v-if="showLocalName"> ({{ showLocalName }}) </span>
          <span v-if="userCamStream">
            <v-btn icon>
              <v-icon @click="toggleUserShrink()" v-if="userCamShrink"
                >mdi-fullscreen</v-icon
              >
              <v-icon @click="toggleUserShrink()" v-else
                >mdi-fullscreen-exit</v-icon
              >
            </v-btn></span
          >
        </h4>

        <div v-if="!userCamStream">
          <h2>No webcam found!</h2>
          <p>Connect a webcam or allow access.</p>
        </div>
        <video
          class="camVideo"
          v-if="userCamStream"
          :width="userWidth"
          height="auto"
          autoplay="true"
          playsinline
          id="userCam"
          muted="muted"
          :src-object.prop.camel="userCamStream"
        ></video>
      </v-col>

      <v-col class="col-xs">
        <div class="mb-3">
          <p v-if="queueStats">
            <span class="dot-green mr-2"></span>
            <span class="font-weight-bold"
              >{{ queueStats.waiting + queueStats.chatting }} online now
            </span>
            <span class="font-weight-regular text--secondary"
              >({{ queueStats.chatting }} chatting,
              {{ queueStats.waiting }} waiting)</span
            >
          </p>
          <v-skeleton-loader v-else type="text"></v-skeleton-loader>
        </div>
        <div class="mb-3">
          <v-btn class="mr-2 mb-2" @click="search" :disabled="!enableSearch"
            ><v-icon dark left> mdi-account-search </v-icon>Find me someone
          </v-btn>
          <v-btn
            class="mr-2 mb-2"
            color="error"
            @click="
              () => {
                userConnected
                  ? (this.blockConfirmDialog = true)
                  : blockReportPeer();
              }
            "
            :disabled="!enableBlock"
            ><v-icon dark left> mdi-cancel </v-icon> Block/Report
            <template v-if="userConnected">this</template
            ><template v-else>last</template> User
          </v-btn>
          <v-btn
            class="mr-2 mb-2"
            @click="closePeerConnection(true)"
            :disabled="!userConnected"
            ><v-icon dark left> mdi-phone-hangup </v-icon>Disconnect
          </v-btn>
        </div>
        <div id="chatarea" class="px-3 py-3">
          <h3>Chat</h3>
          <div class="my-5" id="chatbox">
            <template v-for="(message, i) in chatMessages">
              <p
                v-if="message.sender === '_STATUS_GREEN'"
                :key="i"
                style="color: green"
              >
                <strong>{{ message.text }}</strong>
              </p>
              <p
                v-else-if="message.sender === '_STATUS_RED'"
                :key="i"
                style="color: red"
              >
                <strong>{{ message.text }}</strong>
              </p>
              <p v-else :key="i">
                <strong>{{ message.sender }}: </strong>
                <span v-html="message.html"></span>
              </p>
            </template>
          </div>
          <v-text-field
            label="Type a message..."
            v-model="chatMessageInput"
            :append-outer-icon="'mdi-send'"
            @click:append-outer="sendChatMessage"
            v-on:keyup.enter="sendChatMessage"
            :disabled="!userConnected"
            solo
          ></v-text-field>
        </div>
        <div>
          <v-expansion-panels>
            <v-expansion-panel>
              <v-expansion-panel-header
                >Community Rules</v-expansion-panel-header
              >
              <v-expansion-panel-content>
                <RuleList />
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-col>
    </v-row>
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
        >Connecting you to our matchmaking genie...</v-alert
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
  </v-container>
</template>

<script>
import io from "socket.io-client";
import Peer from "simple-peer";
import Autolinker from "autolinker";

import RuleList from "./RuleList";

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

  components: { RuleList },

  data() {
    return {
      appState: appStates.WS_CONNECTING,

      matchingSocket: null,
      signalingSocket: null,

      queueStats: null,

      localPeer: null,

      localPeerFriendlyName: null,
      remotePeerFriendlyName: null,

      userCamStream: null,
      peerCamStream: null,

      userCamShrink: false,
      peerCamShrink: false,

      chatMessages: [],
      chatMessageInput: "",
      chatBox: null,

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

  computed: {
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
        case appStates.READY: {
          return "Hit 'Find me someone' to get going.";
        }
        case appStates.SEARCHING: {
          return "Finding you someone...";
        }
        case appStates.CONNECTING: {
          return "Prepare your opening line!";
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
                this.addChatMessage({
                  sender: "_STATUS_GREEN",
                  text:
                    "Successfully blocked/reported " + this.toBlockFriendlyName,
                });
                break;
              }
              case "error": {
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
      this.chatMessages.push(chatMessage);
      // This is really bad. Need to diagnose slow v-for performance.
      setTimeout(
        () => (this.chatBox.scrollTop = this.chatBox.scrollHeight),
        100
      );
    },

    closePeerConnection(isInitiator) {
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
  },

  mounted() {
    var self = this;

    this.chatBox = document.getElementById("chatbox");

    self.$store
      .dispatch("getAuthIdTokenAction")
      .catch(() => {
        self.$store
          .dispatch("logoutUserAction")
          .then(() => this.$router.replace("/raven"));
      })
      .then((idToken) => {
        self.matchingSocket = io(process.env.VUE_APP_BACKEND_URL, {
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
                self.appState = appStates.READY;
              })
              .catch(function (error) {
                console.log(error);
                self.appState = appStates.ERROR;
              });
          }

          self.matchingSocket.on("connect_peer", (data) => {
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
            this.$router.replace("/");
          });
        });

        self.matchingSocket.on("connect_error", (error) => {
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
                "Looks like our matchmaking genie has gone missing. Please try again later.";
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

    document.removeEventListener("beforeunload", this.onHardClose);
  },
};
</script>

<style scoped>
.camVideo {
  -webkit-transform: scaleX(-1);
  transform: scaleX(-1);
  -webkit-transition: width 300ms ease-in-out, height 300ms ease-in-out;
  -moz-transition: width 300ms ease-in-out, height 300ms ease-in-out;
  -o-transition: width 300ms ease-in-out, height 300ms ease-in-out;
  transition: width 300ms ease-in-out, height 300ms ease-in-out;
}

#chatbox {
  overflow-y: auto;
  max-height: 30vh;
}

.dot-green {
  height: 10px;
  width: 10px;
  background-color: green;
  border-radius: 50%;
  display: inline-block;
}
</style>