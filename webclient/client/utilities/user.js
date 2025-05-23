import {EncString} from "./encstring";
import {EventManager} from "./event_manager";
import {APP_CONFIG} from "./app_config";
import {Planning} from "./planning";

class User {

    constructor(data) {
        this.events = new EventManager();
        this._build_from_data(data);
    }

    _build_from_data(data) {
        /**
         * @type {number}
         */
        this.id = data.id;
        /**
         * @type {EncString}
         */
        this.display_name = new EncString(data.name);

        console.assert(!data['password_hash'])
        console.assert(!data['email'])
    }

    /**
     * @param data
     * @return {Planning}
     */
    static new(data) {
        return new Planning(data);
    }


    remove() {
        this._build_from_data({id: 0});
        if (APP_CONFIG.connected_user() === this)
            APP_CONFIG.set_connected_user(null);
    }
}

export {User}