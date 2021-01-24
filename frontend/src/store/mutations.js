const mutations = {
    setUser(state, payload) {
        state.user = payload;
    },
    setMessage(state, payload) {
        state.message = payload;
    }
};

export default mutations;