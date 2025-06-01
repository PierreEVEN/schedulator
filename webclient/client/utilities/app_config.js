import {User} from "./user";
import {GLOBAL_EVENTS} from "./event_manager";
import {Calendar} from "./calendar";
import {EncString} from "./encstring";
import {CalendarUser} from "./calendar_user";

class AppConfig {
    constructor() {
        const data = JSON.parse(document.body.dataset['app_config']);
        console.assert(data, "Invalid application configuration data")

        /**
         * @type {User}
         */
        this._connected_user = data.connected_user ? User.new(data.connected_user) : null;

        /**
         * @type {Calendar}
         */
        this._display_calendar = data.display_calendar ? Calendar.new(data.display_calendar) : null;
        if (data.display_calendar_users)
            for (const user of data.display_calendar_users)
                this._display_calendar.add_user(CalendarUser.new(user));

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
            if (!this._display_calendar || !event.state || !event.state._display_calendar || event.state._display_calendar.key !== this._display_calendar.key)
                this.set_display_calendar(event.state ? event.state._display_calendar : null, false);
        })

        if (!this._error_code)
            console.assert(data.origin, "MISSING ORIGIN IN RECEIVED CONFIG");
    }

    set_connected_user(new_user) {
        const old = this._connected_user;
        this._connected_user = new_user;
        GLOBAL_EVENTS.broadcast('on_connected_user_changed', {old: old, new: new_user});
    }

    set_display_calendar(new_calendar, with_state = true) {
        const old = this._display_calendar;
        this._display_calendar = new_calendar;
        if (with_state)
            history.pushState({_display_calendar: this._display_calendar}, "", new_calendar ? `/${new_calendar.key.encoded()}/` : '/');
        GLOBAL_EVENTS.broadcast('on_display_calendar_changed', {old: old, new: new_calendar});
    }

    display_calendar() {
        return this._display_calendar;
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