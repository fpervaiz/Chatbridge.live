const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';
const PORT = process.env.PORT || 3000;

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
});

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid');
const rug = require('random-username-generator');
const Denque = require("denque");

var firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
var firebase = admin.initializeApp(firebaseConfig)

var userQueue = new Denque();
var userQueueCache = new Set();

var roomsHistory = {};
var roomsLive = {};

var tokenCache = {};

app.get('/', (req, res) => {
    res.redirect('https://uniofcam.chat');
});

io.use(function (socket, next) {
    const idToken = socket.handshake.auth.idToken;
    if (idToken) {
        if (idToken in tokenCache) {
            socket.uId = tokenCache[idToken]
            next()
        }
        else {
            firebase.auth().verifyIdToken(idToken)
                .catch((error) => {
                    next(new Error('Unauthorised'));
                }).then((decodedToken) => {
                    socket.uId = decodedToken.uid;
                    tokenCache[idToken] = decodedToken.uid;
                    next();
                })
        }
    } else {
        next(new Error('Unauthorised'));
    }
})

io.on('connection', function (socket) {

    socket.on('search', function () {
        if (!(userQueueCache.has(socket.uId))) {
            console.log('(', socket.id, ') SEARCH')

            var frontOfQueue = userQueue.peekFront();
            while (frontOfQueue && !frontOfQueue.connected) {
                delete userQueueCache[frontOfQueue.uId];
                userQueue.shift();
                console.log('removed disconnected socket from queue');
                frontOfQueue = userQueue.peekFront();
            }

            if (frontOfQueue) {
                if (!roomsHistory[socket.uId] || !roomsHistory[socket.uId][frontOfQueue.uId] || Date.now() - roomsHistory[socket.uId][frontOfQueue.uId] >= 1800000) {
                    console.log('Found match for ', socket.id, ' (', frontOfQueue.id, ')');

                    userQueueCache.delete(userQueue.shift().uId);

                    if (!roomsHistory[socket.uId]) {
                        roomsHistory[socket.uId] = {};
                    }

                    if (!roomsHistory[frontOfQueue.uId]) {
                        roomsHistory[frontOfQueue.uId] = {};
                    }

                    roomsHistory[socket.uId][frontOfQueue.uId] = Date.now();
                    roomsHistory[frontOfQueue.uId][socket.uId] = Date.now();

                    socket.friendlyName = rug.generate();
                    frontOfQueue.friendlyName = rug.generate();

                    const newRoomId = uuidv4();
                    const initiatorId = socket.id;
                    const receiverId = frontOfQueue.id;
                    const initiatorFriendlyName = socket.friendlyName
                    const receiverFriendlyName = frontOfQueue.friendlyName

                    roomsLive[newRoomId] = {
                        [initiatorId]: socket,
                        [receiverId]: frontOfQueue
                    }
                    socket.emit('connect_peer', { roomId: newRoomId, peerId: receiverId, peerFriendlyName: receiverFriendlyName, localFriendlyName: initiatorFriendlyName, isInitiator: true });
                    frontOfQueue.emit('connect_peer', { roomId: newRoomId, peerId: initiatorId, peerFriendlyName: initiatorFriendlyName, localFriendlyName: receiverFriendlyName, isInitiator: false });
                }
                else {
                    userQueue.push(socket);
                    userQueueCache.add(socket.uId);
                    console.log('queue length ', userQueue.length)
                }
            }
            else {
                userQueue.push(socket);
                userQueueCache.add(socket.uId);
                console.log('queue length ', userQueue.length)
            }
        }
    });

    socket.on('signal_send', (data) => {
        const senderPeerId = socket.id;
        console.log(socket.id, 'SIGNAL_SEND', data.roomId, data.destinationPeerId)
        var peerSocket = roomsLive[data.roomId][data.destinationPeerId];
        peerSocket.emit('signal_receive', { roomId: data.roomId, peerId: senderPeerId, signalData: data.signalData });
    })
});

http.listen(process.env.PORT, () => {
    console.log('CORS origin:', CORS_ORIGIN);
    console.log('listening on *:', PORT);
});