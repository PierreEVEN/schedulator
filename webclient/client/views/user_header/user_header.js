const {Authentication} = require("../../utilities/authentication/authentication");
const {APP_CONFIG} = require("../../utilities/app_config");
const {GLOBAL_EVENTS} = require("../../utilities/event_manager");


let container = document.getElementById('user-header-container');

const header = require('./user_header.hbs')({}, {
    signin:() => {
        Authentication.login()
    },
    signup: () => {
        Authentication.signup()
    },
    logout: async () => {
        await Authentication.logout();
    }
})

GLOBAL_EVENTS.add('on_connected_user_changed', (payload) => {
    refresh_connected_user(payload.new);
});

function refresh_connected_user(user) {
    if (user) {
        header.elements.mode_default.style.display = 'none';
        header.elements.mode_connected.style.display = 'flex';
    } else {
        header.elements.mode_default.style.display = 'flex';
        header.elements.mode_connected.style.display = 'none';
    }
}
refresh_connected_user(APP_CONFIG.connected_user());

container.append(header)



