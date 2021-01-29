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
const generateName = require('sillyname')
const Denque = require("denque")

var serviceAccount = process.env.FIREBASE_CONFIG_B64 ? JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG_B64, 'base64').toString('ascii')) : require("./firebaseSA.credential.json")

var firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

var userQueue = new Denque()
var userQueueCache = new Set()

var roomsHistory = {}

var tokenCache = {}

var connectedUsers = new Set()

var idMap = {}

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
                idMap[socket.id] = socket.uId
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
                        idMap[socket.id] = socket.uId
                        next()
                    }

                })
        }
    } else {
        next(new Error('unauthorised'))
    }
})

io.on('connection', function (socket) {

    socket.on('search', () => {
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

                    const newRoomId = uuidv4()
                    const initiatorFriendlyName = generateName()
                    const receiverFriendlyName = generateName()

                    socket.roomId = newRoomId
                    frontOfQueue.roomId = newRoomId

                    socket.join(newRoomId)
                    frontOfQueue.join(newRoomId)

                    socket.friendlyName = initiatorFriendlyName
                    frontOfQueue.friendlyName = receiverFriendlyName

                    socket.emit('connect_peer', { peerId: frontOfQueue.id, localFriendlyName: initiatorFriendlyName, peerFriendlyName: receiverFriendlyName, isInitiator: true })
                    frontOfQueue.emit('connect_peer', { peerId: socket.id, localFriendlyName: receiverFriendlyName, peerFriendlyName: initiatorFriendlyName, isInitiator: false })
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

    socket.on('signal', (data) => {
        socket.to(socket.roomId).emit('signal', { signalData: data.signalData })
    })

    socket.on('disconnect_peer', () => {
        const roomId = socket.roomId
        socket.to(roomId).emit('disconnect_peer')
        io.sockets.in(roomId).sockets.forEach((socket) => {
            socket.leave(roomId)
            socket.roomId = null
        })
    })

    socket.on('block_report', (data, callback) => {
        console.log(data)
        // Looking up the socket by socket ID doesn't work if the
        // socket we are looking for has since disconnected. For now,
        // use a persistent map of socket ID -> user uID.
        // 
        // const uId = io.sockets.sockets.get(blockReportData.peerId).uId
        //

        const fromUid = socket.uId
        const toUid = idMap[data.peerId]

        const dateInt = Date.now()
        const dateObj = admin.firestore.Timestamp.fromDate(new Date())

        if (data.formData.toBlock) {
            firebase.firestore().collection('users').doc(fromUid)
                .set({ blocked: { [toUid]: dateObj } }, { merge: true })
                .then(() => {
                    console.log('Set block for', toUid, 'from', fromUid);
                })
                .catch((error) => {
                    console.log('Error setting firestore block', error);
                    callback({
                        status: 'error'
                    })
                })
        }

        if (data.formData.toReport) {

            const report = {
                [fromUid]: {
                    [dateInt]: {
                        time: dateObj,
                        reason: data.formData.reportReason
                    }
                }
            }

            firebase.firestore().collection('users').doc(toUid)
                .set({ reports: report }, { merge: true })
                .then(() => {
                    console.log('Set report for', toUid, 'from', fromUid);
                })
                .catch((error) => {
                    console.log('Error setting firestore report', error);
                    callback({
                        status: 'error'
                    })
                })
        }

        callback({
            status: 'ok'
        })
    })

    socket.on('disconnect', () => {
        if (socket.roomId) {
            const roomId = socket.roomId
            socket.to(roomId).emit('disconnect_peer')
            io.sockets.in(roomId).sockets.forEach((socket) => {
                socket.leave(roomId)
                socket.roomId = null
            })
        }
        userQueueCache.delete(socket.uId)
        connectedUsers.delete(socket.uId)
    })
})

http.listen(PORT, () => {
    console.log('CORS origin:', CORS_ORIGIN)
    console.log('listening on *:', PORT)
})