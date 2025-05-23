import {EncString} from "./encstring";
import {EventManager} from "./event_manager";
import {APP_CONFIG} from "./app_config";
import {Planning} from "./planning";

class PlanningUser {

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
     * @return {PlanningUser}
     */
    static new(data) {
        return new PlanningUser(data);
    }
}

export {PlanningUser}