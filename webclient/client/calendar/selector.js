import {EventManager} from "../utilities/event_manager";

class Selector {
    constructor() {

        /**
         * @type {EventManager}
         */
        this.events = new EventManager();

        this._per_day_selections = new Map();

    }

    begin_selection() {
        return 0;
    }

    update_selection() {

    }

    end_selection() {

    }
}

export {Selector}