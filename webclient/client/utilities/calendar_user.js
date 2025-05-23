import {EncString} from "./encstring";
import {EventManager} from "./event_manager";
import {APP_CONFIG} from "./app_config";
import {Calendar} from "./calendar";

class CalendarUser {

    constructor(data) {
        this._build_from_data(data);
    }

    _build_from_data(data) {
        /**
         * @type {number}
         */
        this.id = Number(data.id);
        /**
         * @type {EncString}
         */
        this.name = new EncString(data.name);
        /**
         * @type {number}
         */
        this.user_id = Number(data.id);
    }

    /**
     * @param data
     * @return {CalendarUser}
     */
    static new(data) {
        return new CalendarUser(data);
    }
}

export {CalendarUser}