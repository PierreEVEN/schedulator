import {EncString} from "./encstring";

class Event {
    constructor(data) {
        this._build_from_data(data);
    }

    _build_from_data(data) {
        /**
         * @type {number}
         */
        this.id = data.id ? Number(data.id) : null;
        /**
         * @type {EncString}
         */
        this.title = new EncString(data.title);
        /**
         * @type {EncString}
         */
        this.source = new EncString(data.source);
        /**
         * @type {number}
         */
        this.owner = Number(data.owner);
        /**
         * @type {number}
         */
        this.calendar = Number(data.calendar);
        /**
         * @type {Date}
         */
        this.start_time = new Date(data.start_time);

        /**
         * @type {Date}
         */
        this.end_time = new Date(data.end_time);

        /**
         * @type {number}
         */
        this.presence = data.presence;
    }

    /**
     * @param data
     * @return {Event}
     */
    static new(data) {
        return new Event(data);
    }
}

export {Event}