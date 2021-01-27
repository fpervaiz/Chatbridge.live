<template>
  <v-container fluid class="my-2">
    <v-row class="mt-2 mb-5">
      <v-col justify="center" align="center"
        ><v-btn @click="search" :disabled="!userCamStream || !wsConnected"
          >Find New Caller
          <v-icon dark right> mdi-account-search </v-icon></v-btn
        ></v-col
      >
    </v-row>
    <v-row class="my-5">
      <v-col cols="6">
        <h4>
          Who?<span v-if="this.remotePeerFriendlyName && this.peerConnected">
            ({{ this.remotePeerFriendlyName }})</span
          >
        </h4>
        <div v-if="!peerCamStream">
          <h2>{{ peerStatusMessages[peerStatus].heading }}</h2>
          <p>{{ peerStatusMessages[peerStatus].subtitle }}</p>
        </div>
        <video
          width="512"
          height="288"
          autoplay="true"
          id="userCam"
          :src-object.prop.camel="peerCamStream"
        ></video>

        <h4>
          You<span v-if="this.localPeerFriendlyName && this.peerConnected">
            ({{ this.localPeerFriendlyName }})</span
          >
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
              <strong>{{ message.sender }}:</strong> {{ message.text }}
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
    <v-overlay v-if="wsConnectionOverlay && !peerConnected">
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
  </v-container>
</template>

<script>
import io from "socket.io-client";
//import SimpleSignalClient from "simple-signal-client";
import Peer from "simple-peer";

export default {
  name: "Chat",

  data() {
    return {
      matchingSocket: null,
      signalingSocket: null,

      localPeer: null,

      currentRoomId: null,
      localPeerId: null,
      remotePeerId: null,
      localPeerFriendlyName: null,
      remotePeerFriendlyName: null,

      userCamStream: null,
      peerCamStream: null,

      chatMessages: [],
      chatMessageInput: "",
      chatBox: null,

      wsConnected: false,
      wsConnectionOverlay: true,
      wsConnectionError: "",
      peerConnected: false,
      peerStatus: "paused",

      peerStatusMessages: {
        paused: {
          heading: "Paused.",
          subtitle: "Hit 'Find' to get going.",
        },
        searching: {
          heading: "Searching...",
          subtitle: "Finding you someone...",
        },
        disconnected: {
          heading: "Disconnected.",
          subtitle: "The other person has left the chat.",
        },
      },
    };
  },

  methods: {
    search() {
      if (this.peerConnected) {
        this.localPeer.destroy();
      }

      if (this.userCamStream) {
        this.matchingSocket.emit("search");
        this.peerStatus = "searching";
      }
    },

    sendChatMessage() {
      if (this.chatMessageInput.length > 0) {
        if (this.peerConnected) {
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

    closePeerConnection() {
      this.chatMessages.push({
        sender: "_STATUS_RED",
        text: "Disconnected from " + this.remotePeerFriendlyName,
      });

      this.peerCamStream = null;
      this.peerConnected = false;
      this.peerStatus = "disconnected";
      this.localPeerId = null;
      this.remotePeerId = null;
      this.localPeerFriendlyName = null;
      this.remotePeerFriendlyName = null;
      this.localPeer = null;
    },

    onHardClose() {
      if (this.peerConnected) {
        this.localPeer.destroy();
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
        self.wsConnected = true;
        self.wsConnectionOverlay = false;
        self.wsConnectionError = "";

        if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({
              video: { facingMode: "user", width: 1280, height: 720 },
              audio: true,
            })
            .then(function (stream) {
              self.userCamStream = stream;
            })
            .catch(function (error) {
              console.log(error);
            });
        }

        self.matchingSocket.on("connect_peer", (data) => {
          console.log(
            "connecting to peer ",
            data.peerId,
            " room ",
            data.roomId
          );
          self.localPeerId = self.matchingSocket.id;
          self.remotePeerId = data.peerId;
          self.localPeerFriendlyName = data.localFriendlyName;
          self.remotePeerFriendlyName = data.peerFriendlyName;
          self.currentRoomId = data.roomId;

          self.localPeer = new Peer({ initiator: data.isInitiator });

          self.localPeer.on("signal", (signalData) => {
            self.matchingSocket.emit("signal_send", {
              roomId: self.currentRoomId,
              destinationPeerId: self.remotePeerId,
              signalData: signalData,
            });
          });

          self.matchingSocket.on("signal_receive", (data) => {
            if (
              data.roomId === self.currentRoomId &&
              data.peerId === self.remotePeerId
            ) {
              self.localPeer.signal(data.signalData);
            } else {
              console.log(
                "unexpected signal data ",
                data.roomId,
                data.peerId,
                data.signalData
              );
            }
          });

          self.localPeer.on("connect", () => {
            this.peerConnected = true;
            console.log("connected to remotePeer!");
            this.chatMessages.push({
              sender: "_STATUS_GREEN",
              text: "Connected to " + this.remotePeerFriendlyName,
            });
            this.localPeer.addStream(this.userCamStream);
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

          self.localPeer.on("close", () => {
            this.closePeerConnection();
          });
        });
      });

      self.matchingSocket.on("connect_error", (error) => {
        console.log(error);
        switch (error.message) {
          case "unauthorised": {
            this.wsConnectionError =
              "Authentication error. Please try again later.";
            break;
          }
          case "already_connected": {
            this.wsConnectionError =
              "You have UniOfCam.Chat open in another tab. Please close it and try again.";
            break;
          }
          default:
            this.wsConnectionError =
              "Looks like our matchmaking genie has gone missing. Please try again later.";
        }
        this.wsConnectionOverlay = true;
      });
    });
  },

  beforeDestroy() {
    if (this.userCamStream) {
      this.userCamStream.getTracks().forEach((track) => track.stop());
    }

    document.removeEventListener("beforeunload", this.onHardClose);
    this.matchingSocket.disconnect();
    console.log("Disconnected matching");
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