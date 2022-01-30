const utils = {
    getBackendUrl: () => {
        return new Promise(function (resolve) {
            if (process.env.VUE_APP_BACKEND_URL) {
                resolve(process.env.VUE_APP_BACKEND_URL)
            } else {
                fetch(
                    "https://service-chatbridge-staging.herokuapp.com/config/url?name=" +
                    process.env.VUE_APP_VERCEL_GIT_COMMIT_REF
                )
                    .then((response) => response.json().then((data) => resolve(data.url)));
            }
        })
    },
    domainToUniversityName: (domain) => {
        switch (domain) {
            case "cam.ac.uk": {
                return "University of Cambridge";
            }
            case "chatbridge.live": {
                return "Chatbridge Admin";
            }
        }
    }
}

export default utils