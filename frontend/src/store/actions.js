import firebase from 'firebase/app';
import 'firebase/auth';

const actions = {
    registerUserAction({ commit }, payload) {
        return new Promise((resolve, reject) => {
            let registerUser = firebase.functions().httpsCallable("registerUser");
            registerUser({
                email: payload.email,
                password: payload.password,
                recaptchaToken: payload.recaptchaToken
            })
                .then(() => {
                    firebase
                        .auth()
                        .signInWithEmailAndPassword(payload.email, payload.password)
                        .then((user) => {
                            user.user.sendEmailVerification().then(() => {
                                firebase
                                    .auth()
                                    .signOut()
                                    .then(() => {
                                        let message = {
                                            type: "success",
                                            text: "Please check your email to verify your address."
                                        }
                                        commit("setMessage", message)
                                        resolve(message);
                                    });
                            });
                        });
                })
                .catch((error) => {
                    let message = {
                        type: "error",
                        text: error,
                    }
                    commit("setMessage", message);
                    reject(message);
                });
        })
    },

    loginUserAction({ commit }, payload) {
        return new Promise((resolve, reject) => {
            firebase
                .auth()
                .signInWithEmailAndPassword(payload.email, payload.password)
                .then((user) => {
                    if (user.user.emailVerified) {
                        let message = {
                            type: "success",
                            text: "Successfully logged in.",
                        }
                        commit("setMessage", message)
                        commit("setUser", user);
                        resolve(message)
                    } else {
                        firebase
                            .auth()
                            .signOut()
                            .then(() => {
                                let message = {
                                    type: "warning",
                                    text: "Please check your email to verify your address.",
                                }
                                commit("setMessage", message)
                                reject(message)
                            });
                    }
                })
                .catch((error) => {
                    let message = {
                        type: "error",
                        text: "",
                    }
                    switch (error.code) {
                        case "auth/user-disabled": {
                            message.text = "Your account has temporarily been suspended. Please try again later."
                            break;
                        }
                        case "auth/wrong-password": {
                            message.text = "Incorrect username or password."
                            break;
                        }
                        default: {
                            message.text = "Error logging in. Please try again later."
                        }
                    }
                    commit("setMessage", message)
                    reject(message)
                });
        })
    },

    loginUserViaRavenAction({ commit }) {
        var authProvider = new firebase.auth.GoogleAuthProvider();
        authProvider.setCustomParameters({
            hd: "cam.ac.uk",
        });
        return new Promise((resolve, reject) => {
            firebase
                .auth()
                .signInWithPopup(authProvider)
                .then((user) => {
                    let message = {
                        type: "success",
                        text: "Successfully logged in.",
                    }
                    commit("setMessage", message)
                    commit("setUser", user);
                    resolve(message)
                })
                .catch((error) => {
                    let message = {
                        type: "error",
                        text: "",
                    }
                    switch (error.code) {
                        case "auth/user-disabled": {
                            message.text = "Your account has temporarily been suspended. Please try again later."
                            break;
                        }
                        case "auth/wrong-password": {
                            message.text = "Incorrect username or password."
                            break;
                        }
                        default: {
                            message.text = "Error logging in. Please try again later."
                        }
                    }
                    commit("setMessage", message)
                    reject(message)
                });
        })
    },

    resetUserPasswordAction({ commit }, payload) {
        return new Promise((resolve) => {
            firebase.auth().sendPasswordResetEmail(payload.email).then(() => {
                let message = {
                    type: "success",
                    text: "Please check your email to set a new password.",
                }
                commit("setMessage", message)
                resolve(message)
            }).catch(() => {
                let message = {
                    type: "success",
                    text: "Please check your email to set a new password.",
                }
                commit("setMessage", message)
                resolve(message)
            })
        })
    },

    logoutUserAction({ commit }) {
        return new Promise((resolve) => {
            firebase.auth().signOut().then(() => {
                commit("setUser", null);
                resolve()
            })
        })

    },

    checkAuthAction({ commit }) {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged(user => {
                if (user && user.emailVerified) {
                    commit("setUser", user)
                    resolve(user)
                }
                else {
                    commit("setUser", null)
                    resolve(null)
                }
            })
        })
    },

    getAuthIdTokenAction() {
        return new Promise((resolve, reject) => {
            firebase.auth().currentUser.getIdToken().then((idToken) => {
                resolve(idToken);
            }).catch((error) => {
                console.log(error);
                reject();
            })
        })
    },

    clearMessageAction({ commit }) {
        commit("setMessage", {})
    }
};

export default actions;