require('dotenv').config()

const ENVIRONMENT = process.env.ENVIRONMENT || 'development'
const CONFIG_TOKEN = process.env.CONFIG_TOKEN || 'x'
const CORS_ORIGIN = process.env.CORS_ORIGIN ? new Set(JSON.parse(process.env.CORS_ORIGIN)) : new Set(['http://localhost:8081'])
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || ""
const PORT = process.env.PORT || 3000
const TURN_SECRET = process.env.TURN_SECRET
const SERVICE_ACCOUNT = process.env.FIREBASE_CONFIG_B64 ? JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG_B64, 'base64').toString('ascii')) : require('./firebaseSA.credential.json')
const ALLOWED_UNIVERSITIES = process.env.ALLOWED_UNIVERSITIES ? new Set(JSON.parse(process.env.ALLOWED_UNIVERSITIES)) : new Set(['cam.ac.uk', 'gmail.com'])
const ALLOWED_REGISTER_UNIVERSITIES = process.env.ALLOWED_REGISTER_UNIVERSITIES ? new Set(JSON.parse(process.env.ALLOWED_REGISTER_UNIVERSITIES)) : new Set(['cam.ac.uk', 'gmail.com'])

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')
const generateName = require('sillyname')
const crypto = require('crypto');
const axios = require('axios');

const express = require('express');
const cors = require('cors');

const app = express();
const bodyParser = require('body-parser');
const http = require('http').Server(app)
const io = require('socket.io')(http, {
    cors: {
        origin: CORS_ORIGIN
    }
})

app.use(bodyParser.json());

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
var recentsCache = {}

var queueStats = {}

for (let university of ALLOWED_UNIVERSITIES) {
    queueStats[university] = {
        queue: 'queue_' + university,
        online: 0,
        searching: 0,
        chatting: 0
    }
}

app.use(cors({ origin: CORS_ORIGIN }))
app.use(bodyParser.json());

app.post('/api/register', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const recaptchaToken = req.body.recaptchaToken;

    axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`)
        .catch((error) => {
            console.log("UNKNOWN ERROR (recaptchaVerify): ", error);
            return res.status(500).json({ error: "internal", message: "Unknown error. Please try again later." });
        })
        .then((response) => {
            if (response.data.success) {
                let university = email.split("@").pop();
                if (ALLOWED_REGISTER_UNIVERSITIES.has(university)) {
                    admin.auth().createUser({
                        email: email,
                        password: password,
                        emailVerified: false,
                        displayName: email,
                        disabled: false,
                    })
                        .then((userRecord) => {
                            console.log("Successfully created new user: ", userRecord.email, userRecord.uid);
                            return res.json({
                                email: userRecord.email,
                                uid: userRecord.uid,
                            });
                        })
                        .catch((error) => {
                            if (error.code === "auth/email-already-exists") {
                                return res.status(400).json({ error: "account-already-exists", message: "You already have an account here. Try logging in instead." });
                            } else {
                                console.log("UNKNOWN ERROR (createUser): ", error);
                                return res.status(500).json({ error: "internal", message: "Unexpected error. Please try again later." });
                            }
                        });
                } else {
                    return res.status(400).json({ error: "email-not-supported", message: "Your email address is not supported." });
                }
            } else {
                return res.status(400).json({ error: "bad-recaptcha", message: "reCaptcha verification failed. Please try again." });
            }
        });
})

app.get('/*', (req, res) => {
    res.redirect('https://chatbridge.live')
})

app.post('/config/branch/' + CONFIG_TOKEN, (req, res) => {
    if (ENVIRONMENT == 'staging') {
        const name = req.body.name
        const num = req.body.num

        firebase.firestore()
            .collection('config')
            .doc(`branch|${name}`)
            .set({ num })
            .then(() => res.sendStatus(200))
            .catch((err) => res.status(500).send(err))
    } else {
        res.sendStatus(404)
    }
})

app.get('/config/url', (req, res) => {
    if (ENVIRONMENT == 'staging') {
        const name = req.query.name

        firebase.firestore()
            .collection('config')
            .doc(`branch|${name}`)
            .get()
            .then((doc) => { const data = doc.data(); res.status(200).json({ url: `https://service-chatbridge-pr-${data.num}.herokuapp.com` }) })
            .catch((err) => res.status(500).send(err))
    } else {
        res.sendStatus(404)
    }
})

setInterval(async () => {
    for (let university of ALLOWED_UNIVERSITIES) {
        let universityQueue = queueStats[university].queue
        let sockets = await io.in(university).fetchSockets()

        queueStats[university].online = sockets.length
        queueStats[university].searching = (await io.sockets.in(universityQueue).allSockets()).size
        queueStats[university].chatting = sockets.filter(socket => socket.roomId).length

        io.to(university).emit('queue_stats', queueStats[university])
    }
}, 10000)

io.use((socket, next) => {
    if (socket.request.headers.origin && CORS_ORIGIN.has(socket.request.headers.origin)) {
        next()
    }
    else {
        console.log(`BLOCKED_ORIGIN: ${socket.request.headers.origin}`)
        next(new Error('unauthorised'))
    }
})

io.use((socket, next) => {
    const idToken = socket.handshake.auth.idToken

    if (idToken) {
        firebase.auth().verifyIdToken(idToken, true)
            .then((decodedToken) => {
                socket.uid = decodedToken.uid
                socket.email = decodedToken.email
                next()
            })
            .catch((error) => {
                console.log(`VERIFY_TOKEN_ERROR: ${error}`)
                next(new Error('unauthorised'))
            })
    }
    else {
        new Error('unauthorised')
    }
})

io.use((socket, next) => {
    if (connectedUsers.has(socket.uid)) {
        next(new Error('already_connected'))
    }
    else {
        let university = socket.email.toLowerCase().split('@').pop()
        if (ALLOWED_UNIVERSITIES.has(university)) {
            socket.university = university
            socket.university_queue = 'queue_' + university
            next()
        }
        else { next(new Error('unauthorised')) }
    }
})

io.use((socket, next) => {
    firebase.firestore().collection('users').doc(socket.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data()

                socket.userBlocks = data?.blocked || {}
            } else {
                // New user
                firebase.auth().getUser(socket.uid).then((userRecord) => {
                    firebase.firestore().collection('users').doc(socket.uid).set({
                        email: userRecord.email,
                        displayName: userRecord.displayName,
                        university: socket.university,
                    })
                })

                socket.userBlocks = {}
            }

            socket.recents = recentsCache[socket.uid] || {}
            next()
        })
        .catch((error) => {
            console.log(`FIRESTORE_GET_USER_ERROR: ${socket.uid}: ${error}`)
            next(new Error('unauthorised'))
        })
})

io.on('connection', function (socket) {
    socket.join(socket.university)
    connectedUsers.add(socket.uid)
    console.log(`CONNECTED (${socket.university}): ${socket.id}`)

    socket.on('search', () => {
        socket.join(socket.university_queue)

        console.log(`SEARCH (${socket.university_queue}): ${socket.id}`)

        io.sockets.in(socket.university_queue).allSockets().then((sockets) => {
            var match = null
            for (let candidateId of sockets) {
                var candidate = io.sockets.sockets.get(candidateId)
                const notSelf = socket.uid !== candidate.uid
                const notRecent = !(candidate.uid in socket.recents && (Date.now() - socket.recents[candidate.uid]) <= 1800000)
                const notBlocked = !(socket.userBlocks && candidate.uid in socket.userBlocks) && !(candidate.userBlocks && socket.uid in candidate.userBlocks)

                if (notSelf && notRecent && notBlocked) {
                    match = candidate
                    break
                }
            }

            if (match) {
                console.log(`MATCH (${socket.university_queue}): ${socket.id} <-> ${match.id}`)

                socket.recents[match.uid] = Date.now()
                match.recents[socket.uid] = Date.now()

                const newRoomId = uuidv4()
                const initiatorFriendlyName = generateName()
                const receiverFriendlyName = generateName()

                socket.leave(socket.university_queue)
                match.leave(match.university_queue)

                socket.join(newRoomId)
                match.join(newRoomId)

                socket.peerUid = match.uid
                match.peerUid = socket.uid

                socket.friendlyName = initiatorFriendlyName
                socket.peerFriendlyName = receiverFriendlyName

                match.friendlyName = receiverFriendlyName
                match.peerFriendlyName = initiatorFriendlyName

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
        const fromUid = socket.uid
        const fromName = socket.friendlyName

        const toUid = socket.peerUid
        const toName = socket.peerFriendlyName

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
                    console.log(`BLOCKED (${socket.university}): ${fromUid} -> ${toUid}`)
                })
                .catch((error) => {
                    console.log(`BLOCK_ERROR (${socket.university}): ${fromUid} -> ${toUid}: ${error}`)
                    callback({
                        status: 'error'
                    })
                })
        }

        if (data.formData.toReport) {
            var reportedSocket = io.sockets.sockets.get(data.peerId)
            if (reportedSocket) {
                reportedSocket.emit('force_logout');
            }

            const report = {
                reported: toUid,
                reportedName: toName,
                from: fromUid,
                fromName: fromName,
                time: dateObj,
                reason: data.formData.reportReason
            }

            firebase.firestore().collection('reports').add(report).then((docRef) => {
                const reportRef = {
                    [dateInt]: docRef
                }
                firebase.firestore().collection('users').doc(toUid)
                    .set({ reports: reportRef }, { merge: true }).then(() => {
                        console.log(`REPORTED (${socket.university}): ${fromUid} -> ${toUid}`)
                    })
            })
                .catch((error) => {
                    console.log(`REPORT_ERROR (${socket.university}): ${fromUid} -> ${toUid}: ${error}`)
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

        recentsCache[socket.uid] = socket.recents
        connectedUsers.delete(socket.uid)
        socket.leave(socket.university)
        console.log(`DISCONNECTED (${socket.university}): ${socket.id}`)
    })
})

http.listen(PORT, () => {
    console.log('---------------------------------------------------------')
    console.log('service.chatbridge.live')
    console.log(`CORS origin:`, CORS_ORIGIN)
    console.log(`Listening on *:${PORT}`)
    console.log('')
})