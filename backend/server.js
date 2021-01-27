require('dotenv').config()

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080'
const PORT = process.env.PORT || 3000

const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
})

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')
const rug = require('random-username-generator')
const Denque = require("denque")

var firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

var firebase = admin.initializeApp(firebaseConfig)

var userQueue = new Denque()
var userQueueCache = new Set()

var roomsHistory = {}
var roomsLive = {}

var tokenCache = {}

var connectedUsers = new Set()

app.get('/', (req, res) => {
    res.redirect('https://uniofcam.chat')
})

io.use(function (socket, next) {
    const idToken = socket.handshake.auth.idToken
    if (idToken) {
        if (idToken in tokenCache) {
            socket.uId = tokenCache[idToken]
            if (connectedUsers.has(socket.uId)) {
                next(new Error('already_connected'))
            }
            else {
                connectedUsers.add(socket.uId)
                next()
            }
        }
        else {
            firebase.auth().verifyIdToken(idToken)
                .catch((error) => {
                    console.log('Firebase error', error)
                    next(new Error('unauthorised'))
                }).then((decodedToken) => {
                    socket.uId = decodedToken.uid
                    if (connectedUsers.has(socket.uId)) {
                        next(new Error('already_connected'))
                    }
                    else {
                        tokenCache[idToken] = decodedToken.uid
                        connectedUsers.add(socket.uId)
                        next()
                    }

                })
        }
    } else {
        next(new Error('unauthorised'))
    }
})

io.on('connection', function (socket) {

    socket.on('search', function () {
        if (!(userQueueCache.has(socket.uId))) {
            console.log('(', socket.id, ') SEARCH')

            var frontOfQueue = userQueue.peekFront()
            while (frontOfQueue && !frontOfQueue.connected) {
                delete userQueueCache[frontOfQueue.uId]
                userQueue.shift()
                console.log('removed disconnected socket from queue')
                frontOfQueue = userQueue.peekFront()
            }

            if (frontOfQueue) {
                if (!roomsHistory[socket.uId] || !roomsHistory[socket.uId][frontOfQueue.uId] || Date.now() - roomsHistory[socket.uId][frontOfQueue.uId] >= 1800000) {
                    console.log('Found match for ', socket.id, ' (', frontOfQueue.id, ')')

                    userQueueCache.delete(userQueue.shift().uId)

                    if (!roomsHistory[socket.uId]) {
                        roomsHistory[socket.uId] = {}
                    }

                    if (!roomsHistory[frontOfQueue.uId]) {
                        roomsHistory[frontOfQueue.uId] = {}
                    }

                    roomsHistory[socket.uId][frontOfQueue.uId] = Date.now()
                    roomsHistory[frontOfQueue.uId][socket.uId] = Date.now()

                    socket.friendlyName = rug.generate()
                    frontOfQueue.friendlyName = rug.generate()

                    const newRoomId = uuidv4()
                    const initiatorId = socket.id
                    const receiverId = frontOfQueue.id
                    const initiatorFriendlyName = socket.friendlyName
                    const receiverFriendlyName = frontOfQueue.friendlyName

                    roomsLive[newRoomId] = {
                        [initiatorId]: socket,
                        [receiverId]: frontOfQueue
                    }
                    socket.emit('connect_peer', { roomId: newRoomId, peerId: receiverId, peerFriendlyName: receiverFriendlyName, localFriendlyName: initiatorFriendlyName, isInitiator: true })
                    frontOfQueue.emit('connect_peer', { roomId: newRoomId, peerId: initiatorId, peerFriendlyName: initiatorFriendlyName, localFriendlyName: receiverFriendlyName, isInitiator: false })
                }
                else {
                    userQueue.push(socket)
                    userQueueCache.add(socket.uId)
                    console.log('queue length ', userQueue.length)
                }
            }
            else {
                userQueue.push(socket)
                userQueueCache.add(socket.uId)
                console.log('queue length ', userQueue.length)
            }
        }
    })

    socket.on('signal_send', (data) => {
        const senderPeerId = socket.id
        console.log(socket.id, 'SIGNAL_SEND', data.roomId, data.destinationPeerId)
        var peerSocket = roomsLive[data.roomId][data.destinationPeerId]
        peerSocket.emit('signal_receive', { roomId: data.roomId, peerId: senderPeerId, signalData: data.signalData })
    })

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.uId)
    })
})

http.listen(PORT, () => {
    console.log('CORS origin:', CORS_ORIGIN)
    console.log('listening on *:', PORT)
})