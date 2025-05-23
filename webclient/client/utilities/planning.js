import {EncString} from "./encstring";
import {fetch_api} from "./request";
import {Message, NOTIFICATION} from "../views/message_box/notification";
import {EventManager} from "./event_manager";
import {APP_CONFIG} from "./app_config";
import {PlanningUser} from "./planning_user";

class Planning {
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
         * @type {PlanningUser[]}
         */
        this.users = [];
    }

    /**
     * @param data
     * @return {Planning}
     */
    static new(data) {
        return new Planning(data);
    }

    /**
     * @param key {EncString}
     * @returns {Planning}
     */
    static async get(key) {
        const res = await fetch_api(`planning/get/${key.encoded()}/`, 'GET').catch(error => {
            NOTIFICATION.error(new Message(error).title("Impossible de télécharger l'agenda"));
        });
        const planning = Planning.new(res.planning);
        for (const user of res.users)
            planning.add_user(PlanningUser.new(user));
        return planning;
    }

    remove() {
        this._build_from_data({id: 0});
        if (APP_CONFIG.display_planning() === this)
            APP_CONFIG.set_display_planning(null);
    }

    /**
     * @param planning_user {PlanningUser}
     */
    add_user(planning_user) {
        this.users.push(planning_user);
    }
}

export {Planning}