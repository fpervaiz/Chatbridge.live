require('dotenv').config()

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080'
const PORT = process.env.PORT || 3000
const TURN_SECRET = process.env.TURN_SECRET
const SERVICE_ACCOUNT = process.env.FIREBASE_CONFIG_B64 ? JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG_B64, 'base64').toString('ascii')) : require("./firebaseSA.credential.json")

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')
const generateName = require('sillyname')
const crypto = require('crypto');

const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
})

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

var connectedUsers = new Set()

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

                    firebase.firestore().collection('users').doc(socket.uId).get()
                        .catch((error) => {
                            console.log('error retrieving', socket.uId, 'blocks from firebase', error)
                        })
                        .then((doc) => {
                            const data = doc.data()
                            if (data.university) {
                                socket.university = data.university
                            }
                            else {
                                // next(new Error('unauthorised'))
                                socket.university = "cam.ac.uk"
                            }
                            if (data.blocked) {
                                socket.userBlocks = data.blocked
                            }
                            socket.recents = {}
                            connectedUsers.add(socket.uId)
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
        socket.join(socket.university)
        console.log(`SEARCH (${socket.university}): ${socket.id}`)

        io.sockets.in(socket.university).allSockets().then((sockets) => {
            var match = null
            for (let candidateId of sockets) {
                var candidate = io.sockets.sockets.get(candidateId)
                const notSelf = socket.uId !== candidate.uId
                const notRecent = !(candidate.uId in socket.recents && (Date.now() - socket.recents[candidate.uId]) <= 1800000)
                const notBlocked = !(socket.userBlocks && candidate.uId in socket.userBlocks) && !(candidate.userBlocks && socket.uId in candidate.userBlocks)

                if (notSelf && notRecent && notBlocked) {
                    match = candidate
                    break
                }
            }

            if (match) {
                console.log(`MATCH (${socket.university}): ${socket.id} <-> ${match.id}`)

                socket.recents[match.uId] = Date.now()
                match.recents[socket.uId] = Date.now()

                const newRoomId = uuidv4()
                const initiatorFriendlyName = generateName()
                const receiverFriendlyName = generateName()

                socket.leave(socket.university)
                match.leave(match.university)

                socket.join(newRoomId)
                match.join(newRoomId)

                socket.peerUid = match.uId
                match.peerUid = socket.uId

                socket.friendlyName = initiatorFriendlyName
                match.friendlyName = receiverFriendlyName

                socket.roomId = newRoomId
                match.roomId = newRoomId

                socket.emit('connect_peer', { peerId: match.id, localFriendlyName: initiatorFriendlyName, peerFriendlyName: receiverFriendlyName, isInitiator: true, turnCreds: generateTURNCredentials(TURN_SECRET) })
                match.emit('connect_peer', { peerId: socket.id, localFriendlyName: receiverFriendlyName, peerFriendlyName: initiatorFriendlyName, isInitiator: false, turnCreds: generateTURNCredentials(TURN_SECRET) })
            }
        })

    })

    socket.on('signal', (data) => {
        socket.to(socket.roomId).emit('signal', { signalData: data.signalData })
    })

    socket.on('disconnect_peer', () => {
        const roomId = socket.roomId
        socket.to(roomId).emit('disconnect_peer')
        io.sockets.in(roomId).allSockets().then((socketIds) => {
            socketIds.forEach((socketId) => {
                var peer = io.sockets.sockets.get(socketId)
                peer.leave(roomId)
                peer.roomId = null
            })
        })
    })

    socket.on('handle_peer_error', () => {
        socket.leave(socket.roomId)
        socket.roomId = null
    })

    socket.on('block_report', (data, callback) => {
        const fromUid = socket.uId
        const toUid = socket.peerUid

        const dateInt = Date.now()
        const dateObj = admin.firestore.Timestamp.fromDate(new Date())

        if (data.formData.toBlock) {
            if (!(socket.userBlocks)) {
                socket.userBlocks = {}
            }

            socket.userBlocks[toUid] = Date()

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
            io.sockets.in(roomId).allSockets().then((socketIds) => {
                socketIds.forEach((socketId) => {
                    var peer = io.sockets.sockets.get(socketId)
                    peer.leave(roomId)
                    peer.roomId = null
                })
            })
        }
        connectedUsers.delete(socket.uId)
    })
})

http.listen(PORT, () => {
    console.log('CORS origin:', CORS_ORIGIN)
    console.log('listening on *:', PORT)
})