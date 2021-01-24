const getters = {
    getUser(state) {
        return state.user;
    },
    getUserDisplayName(state) {
        if (state.user) {
            return state.user.displayName
        }
    },
    isUserAuth(state) {
        return !!state.user;
    },
    getMessage(state) {
        return state.message;
    }
};

export default getters;