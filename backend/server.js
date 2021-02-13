require('dotenv').config()

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080'
const PORT = process.env.PORT || 3000
const TURN_SECRET = process.env.TURN_SECRET
const SERVICE_ACCOUNT = process.env.FIREBASE_CONFIG_B64 ? JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG_B64, 'base64').toString('ascii')) : require("./firebaseSA.credential.json")

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
const crypto = require('crypto');


var firebase = admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT)
});

function generateTURNCredentials(secret) {
    const unixTimeStamp = parseInt(Date.now() / 1000) + 3 * 3600
    const randInt = Math.floor(Math.random() * 100001)
    const username = [unixTimeStamp, randInt, 'service.chatbridge.live'].join(':')
    var hmac = crypto.createHmac('sha1', secret);
    hmac.setEncoding('base64');
    hmac.write(username);
    hmac.end();
    const password = hmac.read();
    return {
        username: username,
        password: password
    };
}

var userQueue = new Denque()
var userQueueCache = new Set()
var userBlocks = {}

var roomsHistory = {}

var connectedUsers = new Set()

var idMap = {}

app.get('/', (req, res) => {
    res.redirect('https://chatbridge.live')
})

io.use(function (socket, next) {
    const idToken = socket.handshake.auth.idToken
    if (idToken) {
        firebase.auth().verifyIdToken(idToken, true)
            .catch((error) => {
                console.log('Firebase error', error)
                next(new Error('unauthorised'))
            }).then((decodedToken) => {
                socket.uId = decodedToken.uid
                if (connectedUsers.has(socket.uId)) {
                    next(new Error('already_connected'))
                }
                else if (!decodedToken.email.toLowerCase().endsWith('@cam.ac.uk')) {
                    next(new Error('unauthorised'))
                }
                else {
                    connectedUsers.add(socket.uId)
                    idMap[socket.id] = socket.uId
                    firebase.firestore().collection('users').doc(socket.uId).get()
                        .catch((error) => {
                            console.log('error retreiving', socket.uId, 'blocks from firebase', error)
                        })
                        .then((doc) => {
                            const data = doc.data()
                            if (data.blocked) {
                                userBlocks[socket.uId] = data.blocked
                            }
                            next()
                        })
                }

            })
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
                const notRecent = !roomsHistory[socket.uId] || !roomsHistory[socket.uId][frontOfQueue.uId] || Date.now() - roomsHistory[socket.uId][frontOfQueue.uId] >= 1800000
                const notBlocked = !(socket.uId in userBlocks && frontOfQueue.uId in userBlocks[socket.uId]) && !(frontOfQueue.uId in userBlocks && socket.uId in userBlocks[frontOfQueue.uId])

                if (notRecent && notBlocked) {
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

                    socket.emit('connect_peer', { peerId: frontOfQueue.id, localFriendlyName: initiatorFriendlyName, peerFriendlyName: receiverFriendlyName, isInitiator: true, turnCreds: generateTURNCredentials(TURN_SECRET) })
                    frontOfQueue.emit('connect_peer', { peerId: socket.id, localFriendlyName: receiverFriendlyName, peerFriendlyName: initiatorFriendlyName, isInitiator: false, turnCreds: generateTURNCredentials(TURN_SECRET) })
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

    socket.on('handle_peer_error', () => {
        socket.leave(socket.roomId)
        socket.roomId = null
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
            if (!(fromUid in userBlocks)) {
                userBlocks[fromUid] = {}
            }

            userBlocks[fromUid][toUid] = Date()

            firebase.firestore().collection('users').doc(fromUid)
                .set({ blocked: { [toUid]: dateObj } }, { merge: true })
                .then(() => {
                    console.log('Set block for', toUid, 'from', fromUid)
                })
                .catch((error) => {
                    console.log('Error setting firestore block', error)
                    callback({
                        status: 'error'
                    })
                })
        }

        if (data.formData.toReport) {
            var reportedSocket = io.sockets.sockets.get(data.peerId)
            if (reportedSocket) {
                reportedSocket.emit("force_logout");
            }

            const report = {
                reported: toUid,
                from: fromUid,
                time: dateObj,
                reason: data.formData.reportReason
            }

            firebase.firestore().collection('reports').add(report).then((docRef) => {
                const reportRef = {
                    [dateInt]: docRef
                }
                firebase.firestore().collection('users').doc(toUid)
                    .set({ reports: reportRef }, { merge: true }).then(() => {
                        console.log('Set report for', toUid, 'from', fromUid)
                    })
            })
                .catch((error) => {
                    console.log('Error setting firestore report', error)
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
        delete userBlocks[socket.uId]
        userQueueCache.delete(socket.uId)
        connectedUsers.delete(socket.uId)
    })
})

http.listen(PORT, () => {
    console.log('CORS origin:', CORS_ORIGIN)
    console.log('listening on *:', PORT)
})