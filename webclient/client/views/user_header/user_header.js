const {Authentication} = require("../../utilities/authentication/authentication");
const {APP_CONFIG} = require("../../utilities/app_config");


let container = document.getElementById('user-header-container');

const header = require('./user_header.hbs')({}, {
    signin:() => {
        Authentication.login()
    },
    signup: () => {
        Authentication.signup()
    },
    logout: async () => {
        Authentication.logout()
    }
})

if (APP_CONFIG.connected_user()) {
    header.elements.mode_default.style.display = 'none';
    header.elements.mode_connected.style.display = 'flex';
}

container.append(header)



