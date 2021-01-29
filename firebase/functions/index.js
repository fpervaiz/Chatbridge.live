const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

var app = admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.registerUser = functions.https.onCall((data, context) => {
    const email = data.email;
    const password = data.password;
    const recaptchaToken = data.recaptchaToken;

    return axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaToken}`)
        .catch((error) => {
            console.log("UNKNOWN ERROR (recaptchaVerify): ", error);
            throw new functions.https.HttpsError('internal', 'Unknown error. Please try again later.');
        })
        .then((response) => {
            if (response.data.success) {
                if (email.endsWith("@cam.ac.uk")) {
                    return admin.auth().createUser({
                        email: email,
                        password: password,
                        emailVerified: false,
                        displayName: email,
                        disabled: false,
                    })
                        .then((userRecord) => {
                            console.log("Successfully created new user: ", userRecord.email, userRecord.uid);
                            return {
                                email: userRecord.email,
                                uid: userRecord.uid,
                            }
                        })
                        .catch((error) => {
                            if (error.code === "auth/email-already-exists") {
                                throw new functions.https.HttpsError('invalid-argument', 'You already have an account here. Try logging in instead.');
                            }
                            else {
                                console.log("UNKNOWN ERROR (createUser): ", error);
                                throw new functions.https.HttpsError('internal', 'Unexpected error. Please try again later.');
                            }
                        });
                }
                else {
                    throw new functions.https.HttpsError('invalid-argument', 'You must have a @cam.ac.uk address to use UniOfCam.Chat.');
                }
            }
            else {
                throw new functions.https.HttpsError('invalid-argument', 'reCaptcha verification failed. Please try again.');
            }
        })
});

exports.userDocOnCreate = functions.auth.user().onCreate((userRecord, context) => {

    return admin.firestore().collection('users').doc(userRecord.uid)
        .set({
            email: userRecord.email,
            displayName: userRecord.displayName
        })
        .catch(console.error)
})

exports.userDocOnDelete = functions.auth.user().onDelete((userRecord, context) => {

    return admin.firestore().collection('users').doc(userRecord.uid)
        .delete()
        .catch(console.error)
})