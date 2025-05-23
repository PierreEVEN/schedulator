import {User} from "./user";
import {GLOBAL_EVENTS} from "./event_manager";
import {Planning} from "./planning";

class AppConfig {
    constructor() {
        const data = JSON.parse(document.body.dataset['app_config']);
        console.assert(data, "Invalid application configuration data")

        /**
         * @type {User}
         */
        this._connected_user = data.connected_user ? User.new(data.connected_user) : null;

        /**
         * @type {Planning}
         */
        this._display_planning = data.display_planning ? Planning.new(data.display_planning) : null;
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

        addEventListener("popstate", (event) => {
            if (!this._display_planning || !event.state || ! event.state._display_planning || event.state._display_planning.key !== this._display_planning.key)
                this.set_display_planning(event.state ? event.state._display_planning : null, false);
        })

        if (!this._error_code)
            console.assert(data.origin, "MISSING ORIGIN IN RECEIVED CONFIG");
    }

    set_connected_user(new_user) {
        const old = this._connected_user;
        this._connected_user = new_user;
        GLOBAL_EVENTS.broadcast('on_connected_user_changed', {old: old, new: new_user});
    }

    set_display_planning(new_planning, with_state = true) {
        const old = this._display_planning;
        this._display_planning = new_planning;
        if (with_state)
        history.pushState({_display_planning: this._display_planning}, "", new_planning ? `/${new_planning.key.encoded()}/` : '');
        GLOBAL_EVENTS.broadcast('on_display_planning_changed', {old: old, new: new_planning});
    }

    display_planning() {
        return this._display_planning;
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