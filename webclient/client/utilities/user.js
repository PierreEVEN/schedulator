import {EncString} from "./encstring";
import {fetch_api} from "./request";
import {Message, NOTIFICATION} from "../views/message_box/notification";
import {EventManager} from "./event_manager";
import {APP_CONFIG} from "./app_config";

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
     * @return {User}
     */
    static new(data) {
        return new User(data);
    }


    remove() {
        this._build_from_data({id: 0});
        this.events.broadcast('refresh', this);
        if (APP_CONFIG.connected_user() === this)
            APP_CONFIG.set_connected_user(null);
    }

    /**
     * @param name {EncString}
     * @param exact {boolean}
     * @returns {Promise<User[]>}
     */
    static async search_from_name(name, exact) {
        let users = await fetch_api("user/search/", "POST", {name: name, exact: exact})
            .catch(error => NOTIFICATION.fatal(new Message(error).title(`Recherche échouée`)));
        const found_users = [];
        for (const user_id of users) {
            found_users.push(await User.fetch(user_id));
        }
        return found_users;
    }
}

export {User}