const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: 'https://quizzical-ritchie-46875c.netlify.app/',
        methods: ['GET', 'POST']
    }
});
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid');

var firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

var firebase = admin.initializeApp(firebaseConfig)

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

var userQueue = [];
var userQueueCache = new Set();
var sessionHistory = {};
var rooms = {};
var tokenCache = {};

io.use(function (socket, next) {
    const idToken = socket.handshake.auth.idToken;
    if (idToken in tokenCache) {
        socket.uId = tokenCache[idToken]
        next()
    }
    else {
        firebase.auth().verifyIdToken(idToken).catch((error) => {
            const err = new Error('Unauthorised');
            next(err);
        }).then((decodedToken) => {
            socket.uId = decodedToken.uid;
            tokenCache[idToken] = decodedToken.uid;
            next();
        })
    }
})
    .on('connection', function (socket) {
        socket.emit('debug_message', socket.uId)

        socket.on('message', function (message) {
            io.emit('message', message);
        });

        socket.on('search', function () {
            if (!(userQueueCache.has(socket.uId))) {
                console.log('(', socket.id, ') SEARCH')
                if (userQueue[0]) {
                    var frontOfQueue = userQueue[0]
                    if (!sessionHistory[socket.uId] || !sessionHistory[socket.uId][frontOfQueue.uId] || Date.now() - sessionHistory[socket.uId][frontOfQueue.uId] >= 1800000) {
                        console.log('Found match for ', socket.id, ' (', frontOfQueue.id, ')');

                        userQueueCache.delete(userQueue.shift().uId);

                        if (!sessionHistory[socket.uId]) {
                            sessionHistory[socket.uId] = {};
                        }

                        if (!sessionHistory[frontOfQueue.uId]) {
                            sessionHistory[frontOfQueue.uId] = {};
                        }

                        sessionHistory[socket.uId][frontOfQueue.uId] = Date.now();
                        sessionHistory[frontOfQueue.uId][socket.uId] = Date.now();

                        const newRoomId = uuidv4();
                        const initiatorId = socket.id;
                        const receiverId = frontOfQueue.id;

                        rooms[newRoomId] = {
                            [initiatorId]: socket,
                            [receiverId]: frontOfQueue
                        }
                        socket.emit('connect_peer', { roomId: newRoomId, peerId: receiverId, isInitiator: true });
                        frontOfQueue.emit('connect_peer', { roomId: newRoomId, peerId: initiatorId, isInitiator: false });
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
            var peerSocket = rooms[data.roomId][data.destinationPeerId];
            peerSocket.emit('signal_receive', { roomId: data.roomId, peerId: senderPeerId, signalData: data.signalData });
        })
    });

http.listen(process.env.PORT, () => {
    console.log('listening on *:', process.env.PORT);
});