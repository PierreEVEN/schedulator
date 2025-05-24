import {fetch_api} from "../request";
import {EncString} from "../encstring";
import {APP_COOKIES} from "../cookies";
import {APP_CONFIG} from "../app_config";
import {Message, NOTIFICATION} from "../../views/message_box/notification";
import {User} from "../user";
import {MODAL} from "../modal/modal";

const Authentication = {
    login: async () => {
        return await new Promise((success, fail) => {
            let signin_div = require('./signin.hbs')({}, {
                login: async (event) => {
                    event.preventDefault();
                    let result = await fetch_api('user/login/', 'POST', {
                        login: EncString.from_client(signin_div.elements.login.value),
                        password: EncString.from_client(signin_div.elements.password.value),
                        device: EncString.from_client(navigator.userAgent)
                    }).catch(error => {
                        NOTIFICATION.error(new Message(error).title("Connexion échouée"));
                        throw new Error(error);
                    });
                    APP_COOKIES.login(result.token);
                    APP_CONFIG.set_connected_user(User.new(result.user));
                    if (APP_CONFIG.error())
                        location.reload();
                    success();
                    MODAL.close();
                },
                signup: () => {
                    Authentication.signup().then(success).catch(fail);
                },
                reset_password: () => {
                    NOTIFICATION.error(new Message("Unhandled event").title("La réinitialisation de mot de passe n'est pas encore possible"));
                    fail();
                }
            });
            MODAL.open(signin_div, {
                custom_width: '500px', custom_height: '400px', on_close:
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
                    await fetch_api('user/create/', 'POST', {
                        display_name: EncString.from_client(signup_div.elements.login.value),
                        email: EncString.from_client(signup_div.elements.email.value),
                        password: EncString.from_client(signup_div.elements.password.value)
                    }).catch(error => {
                        NOTIFICATION.error(new Message(error).title("Impossible de créer l'utilisateur"));
                        throw new Error(error);
                    });

                    let login_result = await fetch_api('user/login/', 'POST', {
                        login: EncString.from_client(signup_div.elements.login.value),
                        password: EncString.from_client(signup_div.elements.password.value),
                        device: EncString.from_client(navigator.userAgent)
                    }).catch(error => {
                        NOTIFICATION.error(new Message(error).title("Connexion échouée"));
                        throw new Error(error);
                    });
                    APP_COOKIES.login(login_result.token);
                    APP_CONFIG.set_connected_user(User.new(login_result.user))
                    success();
                    MODAL.close();
                },
                login: () => {
                    Authentication.login().then(success).catch(fail);
                }
            });
            MODAL.open(signup_div, {
                custom_width: '500px', custom_height: '400px', on_close: () => {
                    fail("Authentification annulée");
                }
            });
        });
    },
    logout: async () => {
        await fetch_api('user/logout/', 'POST')
            .catch(error => NOTIFICATION.error(new Message(error).title("Erreur lors de la déconnexion")));
        APP_COOKIES.logout();
        APP_CONFIG.set_connected_user(null);
    }
}

export {Authentication}