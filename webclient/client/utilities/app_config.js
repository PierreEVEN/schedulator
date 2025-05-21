import {User} from "./user";
import {GLOBAL_EVENTS} from "./event_manager";

class AppConfig {
    constructor() {
        const data = JSON.parse(document.body.dataset['app_config']);
        console.assert(data, "Invalid application configuration data")

        /**
         * @type {User}
         */
        this._connected_user = data.connected_user ? User.new(data.connected_user) : null;
        /**
         * @type {String}
         */
        this._origin = data.origin;
        /**
         * @type {string|null}
         */
        this._error_message = data.error_message;

        /**
         * @type {string|null}
         */
        this._error_code = data.error_code;

        if (!this._error_code)
            console.assert(data.origin, "MISSING ORIGIN IN RECEIVED CONFIG");
    }

    set_connected_user(new_user) {
        const old = this._connected_user;
        this._connected_user = new_user;
        GLOBAL_EVENTS.broadcast('on_connected_user_changed', {old: old, new: new_user});
    }

    connected_user() {
        return this._connected_user;
    }

    origin() {
        return this._origin;
    }

    error() {
        if (this._error_code || this._error_message)
            return {code: this._error_code, message: this._error_message}
        return null;
    }
}

/**
 * @type {AppConfig}
 */
let APP_CONFIG = new AppConfig();

export {APP_CONFIG}