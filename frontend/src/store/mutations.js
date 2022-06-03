const mutations = {
    setUser(state, payload) {
        state.user = payload;
    },
    setMessage(state, payload) {
        state.message = payload;
    },
    setBackendUrl(state, payload) {
        console.log("Backend URL: " + payload);
        state.backendUrl = payload;
    }
};

export default mutations;