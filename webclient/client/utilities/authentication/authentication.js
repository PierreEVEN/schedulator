import {fetch_api} from "../request";
import {EncString} from "../encstring";
import {APP_COOKIES} from "../cookies/cookies";
import {APP_CONFIG} from "../app_config";
import {Message, NOTIFICATION} from "../../views/message_box/notification";
import {User} from "../user";

require('./authentication.scss')

function play_error_anim(div) {
    div.animate([
        {},
        {
            backgroundColor: '#B6492D41',
        },
        {}
    ], {
        iterations: 3,
        duration: 200,
    })
}

const Authentication = {
    login: async () => {
        return await new Promise((success, fail) => {
            let signin_div = require('./signin.hbs')({}, {
                login: async (event) => {
                    event.preventDefault();
                    let result = await fetch_api('user/login', 'POST', {
                        login: EncString.from_client(signin_div.hb_elements.login.value),
                        password: EncString.from_client(signin_div.hb_elements.password.value),
                        device: EncString.from_client(navigator.userAgent)
                    }).catch(error => {
                        const msg = new Message(error)._text.split(':');
                        signin_div.hb_elements.error.innerText = msg[msg.length - 1];
                        play_error_anim(signin_div.hb_elements.error)
                        signin_div.hb_elements.password.value = '';
                        signin_div.hb_elements.login.focus();
                        console.error(error);
                        throw new Error(error);
                    });
                    await APP_COOKIES.login(result.token, signin_div.hb_elements.stay_connected.checked);
                    APP_CONFIG.set_connected_user(User.new(result.user));
                    if (APP_CONFIG.error())
                        location.reload();
                    success();
                    document.getElementById('global-modal').close();
                },
                signup: () => {
                    Authentication.signup().then(success).catch(fail);
                },
                reset_password: async () => {
                    let reset_passwd_div = require('./reset_passwd_login.hbs')({}, {
                        reset: async (event) => {
                            event.preventDefault();
                            const user = EncString.from_client(reset_passwd_div.hb_elements.reset.value);
                            await fetch_api('user/forgot-password-create', 'POST', EncString.from_client(reset_passwd_div.hb_elements.reset.value)).catch(error => {
                                const msg = new Message(error)._text.split(':');
                                reset_passwd_div.hb_elements.error.innerText = msg[msg.length - 1];
                                play_error_anim(reset_passwd_div.hb_elements.error)
                                reset_passwd_div.hb_elements.reset.value = '';
                                reset_passwd_div.hb_elements.reset.focus();
                                throw new Error(error);
                            });

                            let reset_passwd_code_div = require('./reset_passwd_code.hbs')({}, {
                                code: async (event) => {
                                    event.preventDefault();
                                    const code = EncString.from_client(reset_passwd_code_div.hb_elements.code.value);
                                    await fetch_api('user/forgot-password-check', 'POST', {
                                        user: user,
                                        code: code
                                    }).catch(error => {
                                        const msg = new Message(error)._text.split(':');
                                        reset_passwd_code_div.hb_elements.error.innerText = msg[msg.length - 1];
                                        play_error_anim(reset_passwd_code_div.hb_elements.error)
                                        reset_passwd_code_div.hb_elements.code.value = '';
                                        reset_passwd_code_div.hb_elements.code.focus();
                                        throw new Error(error);
                                    });

                                    let reset_passwd_submit_div = require('./reset_passwd_passwd.hbs')({}, {
                                        submit: async (event) => {
                                            event.preventDefault();
                                            const password = EncString.from_client(reset_passwd_submit_div.hb_elements.password.value);
                                            await fetch_api('user/forgot-password-update', 'POST', {
                                                login: user,
                                                code: code,
                                                new_password: password,
                                            }).catch(error => {
                                                const msg = new Message(error)._text.split(':');
                                                reset_passwd_submit_div.hb_elements.error.innerText = msg[msg.length - 1];
                                                play_error_anim(reset_passwd_submit_div.hb_elements.error)
                                                reset_passwd_submit_div.hb_elements.password.value = '';
                                                reset_passwd_submit_div.hb_elements.password.focus();
                                                throw new Error(error);
                                            });
                                            let result = await fetch_api('user/login', 'POST', {
                                                login: user,
                                                password: password,
                                                device: EncString.from_client(navigator.userAgent)
                                            }).catch(error => {
                                                NOTIFICATION.error(new Message(error).title("Impossible de se connecter avec le nouveau mot de passe"));
                                                document.getElementById('global-modal').close();
                                                throw new Error(error);
                                            });
                                            await APP_COOKIES.login(result.token, signin_div.hb_elements.stay_connected.checked);
                                            APP_CONFIG.set_connected_user(User.new(result.user));
                                            document.getElementById('global-modal').close();
                                        }
                                    });
                                    document.getElementById('global-modal').open(reset_passwd_submit_div);
                                    reset_passwd_submit_div.hb_elements.password.value = '';
                                    reset_passwd_submit_div.hb_elements.password.focus();
                                }
                            });
                            document.getElementById('global-modal').open(reset_passwd_code_div);
                        }
                    });
                    document.getElementById('global-modal').open(reset_passwd_div);
                }
            });
            /**
             * @type {CalendarModalContainer}
             */
            const global_modal = document.getElementById('global-modal');
            global_modal.open(signin_div, {on_close:
                    () => {
                        fail("Authentification annulée");
                    }
            });
        });
    },
    signup: async () => {
        return await new Promise((success, fail) => {
            const signup_div = require('./signup.hbs')({}, {
                signup: async (event) => {
                    event.preventDefault();
                    await fetch_api('user/create', 'POST', {
                        display_name: EncString.from_client(signup_div.hb_elements.login.value),
                        email: EncString.from_client(signup_div.hb_elements.email.value),
                        password: EncString.from_client(signup_div.hb_elements.password.value)
                    }).catch(error => {
                        const msg = new Message(error)._text.split(':');
                        signup_div.hb_elements.error.innerText = msg[msg.length - 1];
                        play_error_anim(signup_div.hb_elements.error)
                        signup_div.hb_elements.login.focus();
                        console.error(error);
                        throw new Error(error);
                    });

                    let login_result = await fetch_api('user/login', 'POST', {
                        login: EncString.from_client(signup_div.hb_elements.login.value),
                        password: EncString.from_client(signup_div.hb_elements.password.value),
                        device: EncString.from_client(navigator.userAgent)
                    }).catch(error => {
                        NOTIFICATION.error(new Message(error).title("Connexion échouée"));
                        throw new Error(error);
                    });
                    await APP_COOKIES.login(login_result.token, signup_div.hb_elements.stay_connected.checked);
                    APP_CONFIG.set_connected_user(User.new(login_result.user))
                    success();
                    /**
                     * @type {CalendarModalContainer}
                     */
                    const global_modal = document.getElementById('global-modal');
                    global_modal.close();
                },
                login: () => {
                    Authentication.login().then(success).catch(fail);
                }
            });

            /**
             * @type {CalendarModalContainer}
             */
            const global_modal = document.getElementById('global-modal');
            global_modal.open(signup_div, { on_close: () => {
                    fail("Authentification annulée");
                }
            });
        });
    },
    logout: async () => {
        await fetch_api('user/logout', 'POST')
            .catch(error => NOTIFICATION.error(new Message(error).title("Erreur lors de la déconnexion")));
        APP_COOKIES.logout();
        APP_CONFIG.set_connected_user(null);
    }
}

export {Authentication}