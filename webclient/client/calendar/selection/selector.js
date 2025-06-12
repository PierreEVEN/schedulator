import {EventManager} from "../../utilities/event_manager";

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

        /**
         * @type {Map<number, Selection>}
         * @private
         */
        this._selections = new Map();

        /**
         * @type {number|null}
         * @private
         */
        this._editing_selection = null;

        /**
         * @type {number|null}
         * @private
         */
        this._current_selection = null;

        /**
         * @type {Set<number>}
         * @private
         */
        this._selected_events = new Set();
    }


    /**
     * @param selection_start {Date}
     * @param selection_end {Date}
     * @param additive {boolean}
     * @return {Promise<number>}
     */
    async begin_selection(selection_start, selection_end, additive) {
        if (!additive)
            for (const key of this._selections.keys())
                await this.remove_selection(key)

        let index;
        do {
            index = Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER);
        } while (this._selections.has(index));

        this._selections.set(index, new Selection(selection_start, selection_end));
        await this.events.broadcast('create', index);
        await this.events.broadcast('update', index);
        this._editing_selection = index;
        this._current_selection = index;
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
     * @returns {IterableIterator<number>}
     */
    get_selections() {
        return this._selections.keys();
    }

    async clear() {
        for (const key of this._selections.keys()) {
            await this.remove_selection(key);
        }
    }

    /**
     * @param id {number}
     */
    async select_event(id) {
        await this.clear_selected_events();
        if (this._selected_events.has(id)) {
            await this.deselect_event(id);
        } else {
            this._selected_events.add(id);
            await this.events.broadcast('select-event', id);
        }
    }


    /**
     * @param id {number}
     * @return {boolean}
     */
    is_event_selected(id) {
        return this._selected_events.has(id);
    }

    /**
     * @param id {number}
     */
    async deselect_event(id) {
        if (this._selected_events.has(id)) {
            this._selected_events.delete(id);
            await this.events.broadcast('deselect-event', id);
        }
    }

    async clear_selected_events() {
        for (const event of this._selected_events)
            await this.deselect_event(event);
    }

    /**
     * @return {Set<number>}
     */
    get_selected_events() {
        return this._selected_events;
    }

    /**
     * @returns {number|null}
     */
    current_selection() {
        return this._current_selection;
    }

    release_selection() {
        this._current_selection = null;
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
        this._editing_selection = index;
        await this.events.broadcast('update', index);
        await this._update_bounds_for(index);
    }

    /**
     * @param index {number}
     * @param selection_start {Date}
     */
    async update_selection_start(index, selection_start) {
        const selection = this._selections.get(index);
        if (selection.start === selection_start)
            return;
        if (selection_start < selection.end)
            selection.start = selection_start;
        else {
            selection.start = selection_start;
            selection.end = new Date(selection_start.getTime() + (selection.initial_end.getTime() - selection.initial_start.getTime()))
        }
        this._editing_selection = index;
        await this.events.broadcast('update', index);
        await this._update_bounds_for(index);
    }

    /**
     * @param index {number}
     * @param selection_end {Date}
     */
    async update_selection_end(index, selection_end) {
        const selection = this._selections.get(index);
        if (selection.end === selection_end)
            return;
        if (selection_end > selection.start)
            selection.end = selection_end;
        else {
            selection.end = selection_end;
            selection.start = new Date(selection_end.getTime() - (selection.initial_end.getTime() - selection.initial_start.getTime()))
        }
        this._editing_selection = index;
        await this.events.broadcast('update', index);
        await this._update_bounds_for(index);
    }

    /**
     * @param index {number}
     * @private
     */
    async _update_bounds_for(index) {
        const moved_sel = this.get(index);
        for (const [id, selection] of this._selections) {
            if (id === index)
                continue;
            if (selection.end <= moved_sel.end && selection.start >= moved_sel.start) {
                await this.remove_selection(id);
            } else if (selection.start < moved_sel.end && selection.end >= moved_sel.end) {
                await this.update_selection_start(id, moved_sel.end);
            } else if (selection.end > moved_sel.start && selection.start <= moved_sel.start) {
                await this.update_selection_end(id, moved_sel.start);
            }
        }
    }

    /**
     * @param index {number}
     * @returns {Promise<void>}
     */
    async remove_selection(index) {
        if (this._editing_selection === index)
            this._editing_selection = null;
        if (this._selections.has(index)) {
            this._selections.delete(index);
            await this.events.broadcast('remove', index);
        }
    }

    /**
     * @returns {number|null}
     */
    editing_selection() {
        return this._editing_selection;
    }
}


export {Selector}