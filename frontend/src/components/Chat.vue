<template>
  <v-container fluid class="my-2">
    <v-row class="mt-2 mb-5">
      <v-col justify="center" align="center"
        ><v-btn @click="search"
          >Find New Caller
          <v-icon dark right> mdi-account-search </v-icon></v-btn
        ></v-col
      >
    </v-row>
    <v-row class="my-5">
      <v-col cols="6">
        <h4>Who?</h4>
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

        <h4>You</h4>
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
          <p v-for="(message, i) in chatMessages" :key="i">
            <strong>{{ message.sender }}:</strong> {{ message.text }}
          </p>
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
    <v-snackbar v-model="wsConnected" timeout="2000">Connected</v-snackbar>
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

      userCamStream: null,
      peerCamStream: null,

      chatMessages: [],
      chatMessageInput: "",
      chatBox: null,

      wsConnected: false,
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
        this.endPeerConnection();
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
              sender: this.localPeerId,
              text: this.chatMessageInput,
            },
          };
          this.localPeer.send(JSON.stringify(chatMessage));
          this.chatMessages.push(chatMessage.chatMessage);
          this.chatMessageInput = "";
        } else {
          this.chatMessages.push({
            sender: "Error",
            text: "You aren't connected to anyone",
          });
        }
        this.chatBox.scrollTop =
          this.chatBox.scrollHeight - this.chatBox.clientHeight;
      }
    },

    endPeerConnection() {
      this.localPeer.destroy();
      this.peerCamStream = null;
      this.peerConnected = false;
      this.peerStatus = "disconnected";
      this.remotePeerId = null;
      this.localPeer = null;
    },
  },

  mounted() {
    var self = this;

    this.chatBox = document.getElementById("chatbox");

    self.$store.dispatch("getAuthIdTokenAction").then((idToken) => {
      self.matchingSocket = io("https://uniofcam-chat-backend.herokuapp.com/", {
        transports: ["websocket"],
        auth: {
          idToken: idToken,
        },
      });

      self.matchingSocket.on("connect", () => {
        console.log("matching connected ", self.matchingSocket.id);
        self.wsConnected = true;

        self.matchingSocket.on("connect_peer", (data) => {
          console.log(
            "connecting to peer ",
            data.peerId,
            " room ",
            data.roomId
          );
          self.localPeerId = self.matchingSocket.id;
          self.remotePeerId = data.peerId;
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
    });

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
  },

  beforeDestroy() {
    if (this.userCamStream) {
      this.userCamStream.getTracks().forEach((track) => track.stop());
    }

    this.signalingSocket.disconnect();
    this.matchingSocket.disconnect();
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