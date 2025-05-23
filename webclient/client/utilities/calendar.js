import {EncString} from "./encstring";
import {fetch_api} from "./request";
import {Message, NOTIFICATION} from "../views/message_box/notification";
import {EventManager} from "./event_manager";
import {APP_CONFIG} from "./app_config";
import {CalendarUser} from "./calendar_user";

class Calendar {
    constructor(data) {
        this.events = new EventManager();
        this._build_from_data(data);
    }

    _build_from_data(data) {
        /**
         * @type {number}
         */
        this.id = Number(data.id);
        /**
         * @type {number}
         */
        this.owner_id = Number(data.owner_id);
        /**
         * @type {EncString}
         */
        this.title = new EncString(data.title);
        /**
         * @type {EncString}
         */
        this.key = new EncString(data.key);
        /**
         * @type {number}
         */
        this.start_date = Number(data.start_date);
        /**
         * @type {number}
         */
        this.end_date = Number(data.end_date);
        /**
         * @type {number}
         */
        this.time_precision = Number(data.time_precision);
        /**
         * @type {number}
         */
        this.start_daily_hour = Number(data.start_daily_hour);
        /**
         * @type {number}
         */
        this.end_daily_hour = Number(data.end_daily_hour);
        /**
         * @type {boolean}
         */
        this.require_account = !!data.require_account;
        /**
         * @type {Map<String, CalendarUser>}
         */
        this.users = new Map;
    }

    /**
     * @param data
     * @return {Calendar}
     */
    static new(data) {
        return new Calendar(data);
    }

    /**
     * @param key {EncString}
     * @returns {Calendar}
     */
    static async get(key) {
        const res = await fetch_api(`calendar/get/${key.encoded()}/`, 'GET').catch(error => {
            NOTIFICATION.error(new Message(error).title("Impossible de télécharger le calendrier"));
        });
        const calendar = Calendar.new(res.calendar);
        for (const user of res.users)
            calendar.add_user(CalendarUser.new(user));
        return calendar;
    }

    remove() {
        this._build_from_data({id: 0});
        if (APP_CONFIG.display_calendar() === this)
            APP_CONFIG.set_display_calendar(null);
    }

    /**
     * @param calendar_user {CalendarUser}
     */
    add_user(calendar_user) {
        this.users.set(calendar_user.name.plain(), calendar_user);
    }
}

export {Calendar}