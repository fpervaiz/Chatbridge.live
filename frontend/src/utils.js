const utils = {
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