class UserData {
    constructor() {

        /**
         * <source, event ids>
         * @type {Map<String, number[]>}
         */
        this._event_sources = new Map();
    }

    /**
     * @param event_id {number}
     * @param event {Event}
     */
    register_event(event_id, event) {
        if (this._event_sources.has(event.source.encoded()))
            this._event_sources.get(event.source.encoded()).push(event_id);
        else
            this._event_sources.set(event.source.encoded(), [event_id]);
    }

    /**
     * @param event {Event}
     */
    remove_event(event) {
        this._event_sources.delete(event.source.encoded());
    }

    /**
     * @param source {EncString}
     * @returns {number[]}
     */
    get_events_from_source(source) {
        return this._event_sources.get(source.encoded());
    }
}

class SortedEvent {
    /**
     * @param event {Event}
     */
    constructor(event) {
        this.event = event;
        this.indentation = 0;
        this.num_indentations = 0;
        this.parents = [];
        this.children = [];
    }

    /**
     * @param other {SortedEvent}
     * @return boolean
     */
    collides_with(other) {
        return (this.event.start_time > other.event.start_time && this.event.start_time < other.event.end_time) ||
            (other.event.start_time > this.event.start_time && other.event.start_time < this.event.end_time);
    }

    /**
     * @param event {SortedEvent}
     */
    add_child(event) {
        this.children.push(event);
        event.parents.push(this);
        event.indentation = this.find_level_for_child(event);
    }

    find_indentation_for(event, test_indentation) {
        let is_a_hole = true;
        for (const parent of this.parents) {
            const value = parent.find_level_for_child(event);
            if (value === null) {
                return this.indentation + 1;
            }
        }

        for (const parent of this.parents)
            if (parent.collides_with(event)) {
                is_a_hole = false;
                break;
            }
        if (is_a_hole)
    }
}


class DayEventData {
    constructor() {
        /**
         * @type {Map<number, Event>}
         */
        this._events = new Map()
    }

    /**
     * @return {SortedEvent[]}
     */
    get_events_sorted() {
        /**
         * @type {SortedEvent[]}
         */
        const events = [];
        for (const [_, event] of this._events)
            events.push(new SortedEvent(event))

        // Sort events by start date
        events.sort((a, b) => a.event.start_time - b.event.start_time)

        for (let i = 0; i < events.length; ++i) {
            for (let j = i + 1; j < events.length; ++j) {
                let parent = events[i];
                let child = events[j];

                // If true, we are under the end_time - no possible conflict here
                if (child.event.start_time > parent.event.end_time)
                    break;

                parent.add_child(child);
            }
        }

        return events;
    }

    /**
     * @param event_id {number}
     * @param event {Event}
     */
    register_event(event_id, event) {
        this._events.set(event_id, event);
    }

    /**
     * @param event {number}
     */
    remove_event(event) {
        this._events.delete(event)
    }
}

class EventPool {
    constructor() {
        /**
         * <Start of the day's timestamp, list of event ids this day>
         * @type {Map<number, DayEventData>}
         * @private
         */
        this._per_day_events = new Map()

        /**
         * <event id, event>
         * @type {Map<number, Event>}
         * @private
         */
        this._events = new Map();

        /**
         * <user id, User data>
         * @type {Map<number, UserData>}
         * @private
         */
        this._per_user_data = new Map();
    }

    /**
     * Get registered event ids for the given date
     * @param date {Date | number}
     * @return {{event: Event, indentation: number, num_indentations: number, parent: Object}[]}
     */
    get_day_events(date) {
        let today = new Date(date);
        today.setHours(0, 0, 0, 0);
        const events = this._per_day_events.get(today.getTime());
        if (!events)
            return [];
        return events.get_events_sorted();
    }

    /**
     * Get event by id
     * @param id {number}
     * @returns {Event}
     */
    get_event(id) {
        return this._events.get(id)
    }

    /**
     * Register a new event
     * @param event {Event}
     * @returns {number} id
     */
    register_event(event) {
        let id = event.id;

        // If this is only a temporary event, invent a random id
        if (!id) {
            do {
                id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            } while (this._events.has(id));
        }

        this._events.set(id, event);

        /** Register per day events **/
        const event_current_start = new Date(event.start_time);
        while (event_current_start < event.end_time) {
            event_current_start.setHours(0, 0, 0, 0);
            if (!this._per_day_events.has(event_current_start.getTime()))
                this._per_day_events.set(event_current_start.getTime(), new DayEventData());

            this._per_day_events.get(event_current_start.getTime()).register_event(id, event);
            event_current_start.setDate(event_current_start.getDate() + 1)
        }

        /** Insert user data **/
        if (!this._per_user_data.has(event.owner)) {
            this._per_user_data.set(event.owner, new UserData());
        }
        this._per_user_data.get(event.owner).register_event(id, event);
        return id;
    }

    /**
     * Remove event by id
     * @param id {number}
     */
    remove_event(id) {
        const event = this.get_event(id);
        if (!event)
            return;

        const user_data = this._per_user_data.get(id);
        if (user_data) {
            user_data.remove_event(event);
        }

        this._events.delete(id);

        const event_current_start = new Date(event.start_time);
        while (event_current_start < event.end_time) {
            event_current_start.setHours(0, 0, 0, 0);
            const per_day_data = this._per_day_events.get(event_current_start.getTime());
            per_day_data.remove_event(id);
            event_current_start.setDate(event_current_start.getDate() + 1)
        }
    }
}

export {EventPool}