<template>
  <v-container fluid class="my-2">
    <v-row class="mt-2 mb-5">
      <v-col justify="center" align="center"
        ><v-btn @click="search" :disabled="!enableSearch"
          >Find New Caller
          <v-icon dark right> mdi-account-search </v-icon></v-btn
        ></v-col
      >
      <v-col justify="center" align="center">
        <v-btn
          color="error"
          @click="
            () => {
              showBlockThisUser
                ? (this.blockConfirmDialog = true)
                : blockReportPeer();
            }
          "
          :disabled="!enableBlock"
        >
          Block/Report <template v-if="showBlockThisUser">this</template
          ><template v-else>last</template> User
          <v-icon dark right> mdi-account-cancel </v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <v-row class="my-5">
      <v-col cols="6">
        <h4>
          Who?<span v-if="showRemoteName"> ({{ showRemoteName }})</span>
        </h4>
        <div v-if="!showPeerStream">
          <h2>{{ peerStatusHeading }}</h2>
          <p>{{ peerStatusMessage }}</p>
        </div>
        <video
          width="512"
          height="288"
          autoplay="true"
          id="userCam"
          :src-object.prop.camel="peerCamStream"
        ></video>

        <h4>
          You<span v-if="showLocalName"> ({{ showLocalName }})</span>
        </h4>
        <div v-if="!userCamStream">
          <h2>No webcam found!</h2>
          <p>Connect a webcam or allow access.</p>
        </div>
        <video
          width="512"
          height="288"
          autoplay="true"
          id="peerCam"
          muted="muted"
          :src-object.prop.camel="userCamStream"
        ></video>
      </v-col>
      <v-col cols="6">
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
              <span v-html="autolinker.link(message.text)"></span>
            </p>
          </template>
        </div>

        <v-text-field
          label="Type a message..."
          v-model="chatMessageInput"
          :append-outer-icon="'mdi-send'"
          @click:append-outer="sendChatMessage"
          v-on:keyup.enter="sendChatMessage"
          solo
        ></v-text-field>
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
    <v-snackbar v-model="blockSuccessBar" :timeout="4000" color="success"
      >Submitted successfully.</v-snackbar
    >
    <v-snackbar v-model="blockErrorBar" :timeout="4000" color="error"
      >Error submitting. Please try again.</v-snackbar
    >
  </v-container>
</template>

<script>
import io from "socket.io-client";
import Peer from "simple-peer";
import Autolinker from "autolinker";

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

  data() {
    return {
      appState: appStates.WS_CONNECTING,

      matchingSocket: null,
      signalingSocket: null,

      localPeer: null,

      localPeerFriendlyName: null,
      remotePeerFriendlyName: null,

      userCamStream: null,
      peerCamStream: null,

      chatMessages: [],
      chatMessageInput: "",
      chatBox: null,

      blockConfirmDialog: false,
      blockReportDialog: false,
      blockSuccessBar: false,
      blockErrorBar: false,

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

    showBlockThisUser() {
      return this.appState === appStates.CONNECTED;
    },

    showBlockLastUser() {
      return this.appState === appStates.DISCONNECTED;
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
          return "Hit 'Find' to get going.";
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
          return "Connection failed. Please try again.";
        }
        default: {
          return null;
        }
      }
    },
  },

  methods: {
    search() {
      if (this.appStates === appStates.CONNECTED) {
        this.closePeerConnection(true);
      }

      if (this.userCamStream) {
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
          this.chatMessages.push(chatMessage.chatMessage);
          this.chatMessageInput = "";
        } else {
          this.chatMessages.push({
            sender: "_STATUS_RED",
            text: "You aren't connected to anyone",
          });
        }
        this.chatBox.scrollTop =
          this.chatBox.scrollHeight - this.chatBox.clientHeight;
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
            switch (response.status) {
              case "ok": {
                this.blockReportDialog = false;
                this.$refs.blockReportForm.reset();
                this.blockSuccessBar = true;
                break;
              }
              case "error": {
                this.blockErrorBar = true;
                break;
              }
            }
          }
        );
      }
    },

    closePeerConnection(isInitiator) {
      if (isInitiator) {
        this.matchingSocket.emit("disconnect_peer");
      }

      this.localPeer.destroy();

      this.chatMessages.push({
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
      if (!this.localPeer.destroyed) {
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
  },

  mounted() {
    var self = this;

    this.chatBox = document.getElementById("chatbox");

    self.$store.dispatch("getAuthIdTokenAction").then((idToken) => {
      self.matchingSocket = io(process.env.VUE_APP_BACKEND_URL, {
        transports: ["websocket"],
        reconnectionAttempts: 5,
        auth: {
          idToken: idToken,
        },
      });

      self.matchingSocket.on("connect", () => {
        console.log("matching connected ", self.matchingSocket.id);
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
          console.log("connecting to peer ", data.peerId);
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

          setTimeout(() => {
            if (this.appStates !== appStates.CONNECTED) {
              this.handlePeerError();
            }
          }, 20000);

          self.localPeer.on("signal", (signalData) => {
            self.matchingSocket.emit("signal", {
              signalData: signalData,
            });
          });

          self.localPeer.on("connect", () => {
            this.appState = appStates.CONNECTED;
            console.log("connected to remotePeer!");
            this.chatMessages.push({
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
              self.chatMessages.push(msg.chatMessage);
              this.chatBox.scrollTop =
                this.chatBox.scrollHeight - this.chatBox.clientHeight;
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
      this.wsConnected = false;
      console.log("Disconnected matching");
    }

    document.removeEventListener("beforeunload", this.onHardClose);
  },
};
</script>

<style scoped>
video {
  -webkit-transform: scaleX(-1);
  transform: scaleX(-1);
}
#chatbox {
  overflow: auto;
  height: 320px;
}
</style>