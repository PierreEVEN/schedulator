import {EventManager} from "../utilities/event_manager";

class Selection {
    /**
     * @param start {Date}
     * @param end {Date}
     */
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.initial_start = start;
        this.initial_end = end;
    }
}

class Selector {
    constructor() {

        /**
         * @type {EventManager}
         */
        this.events = new EventManager();

        this._per_day_selections = new Map();

        /**
         * @type {Map<number, Selection>}
         * @private
         */
        this._selections = new Map();
    }

    /**
     * @param selection_start {Date}
     * @param selection_end {Date}
     * @return {Promise<number>}
     */
    async begin_selection(selection_start, selection_end) {
        let index;
        do {
            index = Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER);
        } while (this._selections.has(index));

        this._selections.set(index, new Selection(selection_start, selection_end));
        await this.events.broadcast('create', index);
        await this.events.broadcast('update', index);
        return index;
    }

    /**
     * @param index {number}
     * @returns {Selection}
     */
    get(index) {
        return this._selections.get(index);
    }

    /**
     * @returns {MapIterator<number>}
     */
    get_selections() {
        return this._selections.keys();
    }

    /**
     * @param index {number}
     * @param selection_start {Date}
     * @param selection_end {Date}
     */
    async update_selection(index, selection_start, selection_end) {
        const selection = this._selections.get(index);
        if (selection.start === selection_start || selection.end === selection_end)
            return;
        if (selection_end >= selection_start) {
            selection.start = selection_start;
            selection.end = selection_end;
        } else {
            selection.end = selection_start;
            selection.start = selection_end;
        }
        await this.events.broadcast('update', index);
    }

    /**
     * @param index {number}
     * @param selection_start {Date}
     */
    async update_selection_start(index, selection_start) {
        const selection = this._selections.get(index);
        if (selection.start === selection_start)
            return;
        if (selection_start <= selection.initial_start)
            selection.start = selection_start;
        else {
            selection.start = selection.initial_start;
            selection.end = selection_start;
        }
        await this.events.broadcast('update', index);
    }

    /**
     * @param index {number}
     * @param selection_end {Date}
     */
    async update_selection_end(index, selection_end) {
        const selection = this._selections.get(index);
        if (selection.end === selection_end)
            return;
        if (selection_end >= selection.initial_end)
            selection.end = new Date(Math.max(selection_end.getTime(), selection.initial_end.getTime()));
        else {
            selection.start = new Date(Math.min(selection_end.getTime(), selection.initial_start.getTime()));
            selection.end = selection.initial_end;
        }
        await this.events.broadcast('update', index);
    }

    /**
     * @param index {number}
     * @returns {Promise<void>}
     */
    async remove_selection(index) {
        if (this._selections.has(index))
            this._selections.delete(index);
        await this.events.broadcast('remove', index);
    }
}

export {Selector}