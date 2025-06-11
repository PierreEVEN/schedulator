require('./calendar_day.scss')
const {numberToColorHSL} = require("../../../utilities/colors");
const {ONE_MIN_MS, ONE_DAY_MS} = require("../../../utilities/time_utils");
const {POINTER_UTILS} = require("../../pointer_utils");
require('../../selection/selection')
require('../../widgets/create_events/create_events')

class CalendarDay extends HTMLElement {
    constructor() {
        super();
        /**
         * Daily start in ms
         * @type {number}
         */
        this._daily_start = 60 * 60 * 1000 * 6; // 6h
        /**
         * Daily end in ms
         * @type {number}
         */
        this._daily_end = 60 * 60 * 1000 * 20; // 20h
        /**
         * Minimum time interval in ms
         * @type {number}
         */
        this._daily_spacing = 30 * 60 * 1000; // 30 minutes
        /**
         * Date from this day @ 00:00
         * @type {Date}
         */
        this._date = new Date(Date.now());

        if (this.hasAttribute('daily-start'))
            this._daily_start = Number(this.getAttribute('daily-start'));
        if (this.hasAttribute('daily-end'))
            this._daily_end = Number(this.getAttribute('daily-end'));
        if (this.hasAttribute('spacing'))
            this._daily_spacing = Number(this.getAttribute('spacing'));
        if (this.hasAttribute('date'))
            this._date = new Date(this.getAttribute('date'));
        this._date.setHours(0, 0, 0, 0);

        /**
         * @type {Map<number, HTMLElement>}
         * @private
         */
        this._event_divs = new Map();

        /**
         * @type {Map<number, HTMLElement>}
         * @private
         */
        this._selections = new Map();
    }

    /**
     * @param start {number}
     * @param end {number}
     * @param spacing {number}
     */
    set_range(start, end, spacing) {
        console.assert(start !== null && end !== null && spacing !== null);
        console.assert(start < end);
        console.assert(spacing >= ONE_MIN_MS * 10 && spacing <= ONE_DAY_MS);
        if (this._daily_start === start && this._daily_end === end && this._daily_spacing === spacing)
            return;

        this._daily_start = start;
        this._daily_end = end;
        this._daily_spacing = spacing;
        this._update_display();
    }

    /**
     * @param selector {Selector}
     */
    set_selector(selector) {
        if (this._selector === selector)
            return;

        if (this._selector) {
            this._update_event_cb.remove();
            this._remove_event_cb.remove();
            this._select_event_cb.remove();
            this._deselect_event_cb.remove();
        }

        this._selector = selector;

        for (const selection of this._selections.values())
            selection.remove();
        this._selections.clear();
        if (this._selector) {
            this._update_event_cb = this._selector.events.add('update', (index) => {
                if (!this.isConnected)
                    return;
                this._update_selection(index, true);
            })
            this._remove_event_cb = this._selector.events.add('remove', (index) => {
                const sel = this._selections.get(index);
                if (sel) {
                    sel.remove();
                    this._selections.delete(index);
                }
            })
            for (const event of this._selector.get_selected_events()) {
                const div = this._event_divs.get(event);
                if (div) {
                    div.classList.add('calendar-event-selected');
                }
            }
            this._select_event_cb = this._selector.events.add('select-event', (event) => {
                const div = this._event_divs.get(event);
                if (div) {
                    div.classList.add('calendar-event-selected');
                }
            })
            this._deselect_event_cb = this._selector.events.add('deselect-event', (event) => {
                const div = this._event_divs.get(event);
                if (div) {
                    div.classList.remove('calendar-event-selected');
                }
            })
        }
        if (!this.isConnected)
            return;
        for (const key of this._selector.get_selections())
            this._update_selection(key, false);
    }

    _update_selection(index, select) {
        if (!this._selector)
            return;
        const selection = this._selector.get(index);
        if (selection.end.getTime() <= this._date.getTime() + this._daily_start || selection.start.getTime() >= this._date.getTime() + this._daily_end) {
            const sel = this._selections.get(index);
            if (sel) {
                sel.remove();
                this._selections.delete(index);
            }
            return;
        }

        if (!this._selections.has(index)) {
            const sel_div = document.createElement('calendar-selection');
            sel_div.selection_id = index;
            this._elements.cells.append(sel_div);
            this._selections.set(index, sel_div);
        }

        const daily_range = this._daily_end - this._daily_start;

        const start = Math.max(-1, (selection.start.getTime() - this._date.getTime() - this._daily_start) / daily_range);
        const end = Math.min(2, (selection.end.getTime() - this._date.getTime() - this._daily_start) / daily_range);
        /**
         * @type {CalendarSelection}
         */
        const div = this._selections.get(index);
        div.style.top = `${start * 100}%`;
        div.style.bottom = `${(1 - end) * 100}%`;
        div.update(selection.start, selection.end, select);
    }

    connectedCallback() {
        this._update_display();
        if (this._selector)
            for (const key of this._selector.get_selections())
                this._update_selection(key);
    }

    disconnectedCallback() {
        if (this._even_pool) {
            this._even_pool.remove_event(this._add_event_cb);
            this._even_pool.remove_event(this._remove_event_cb);
        }
    }

    /**
     * @param date {Date}
     */
    set_date(date) {
        const new_date = new Date(date);
        new_date.setHours(0, 0, 0, 0);
        if (this._date.getTime() !== new_date.getTime()) {
            this._date = new Date(new_date);
            this._update_display();
        }
    }

    _update_display() {
        if (!this.isConnected)
            return;

        if (this._elements)
            for (const element of this._elements)
                element.remove();

        const now = new Date(Date.now());
        now.setHours(0, 0, 0, 0);

        const elements = require('./calendar_day.hbs')({
            today: this._date.getTime() === now.getTime(),
            day: this._date.toLocaleDateString(undefined, {weekday: 'short'}),
            num: this._date.getDate()
        });
        for (const element of elements)
            this.append(element);
        this._elements = elements[0].hb_elements;

        let daily_subdivision = (this._daily_end - this._daily_start) / this._daily_spacing;
        for (let i = 0; i < daily_subdivision; ++i) {
            let cell_time_start = new Date(this._date.getTime() + this._daily_start + i * this._daily_spacing);
            let cell_time_end = new Date(this._date.getTime() + this._daily_start + (i + 1) * this._daily_spacing);
            let cell = require('./calendar_cell.hbs')({content: ""});
            cell.cell_time_start = cell_time_start;
            cell.cell_time_end = cell_time_end;
            this._elements.cells.append(cell);
        }

        POINTER_UTILS.events.add('move', ({_, y}) => {
            for (const cell of this._elements.cells.children) {
                const bounds = cell.getBoundingClientRect();
                if (y > bounds.top && y < bounds.bottom) {
                    if (this._last_cell_line_hovered === cell)
                        return;
                    if (this._last_cell_line_hovered)
                        this._last_cell_line_hovered.classList.remove('calendar-hover-line');
                    this._last_cell_line_hovered = cell;
                    this._last_cell_line_hovered.classList.add('calendar-hover-line');
                }
            }
        })

        this._update_events();
    }

    /**
     * Get the cell HtmlElement that include the given date
     * @param date {Date}
     * @returns {HTMLElement|null}
     */
    get_cell_from_date(date) {
        const display_start = this._date.getTime() + this._daily_start;
        if (date.getTime() < display_start)
            return null;
        if (date.getTime() > this._date.getTime() + this._daily_end)
            return null;
        const elapsed_ms = date.getTime() - display_start;
        const index = elapsed_ms / this._daily_spacing;
        return this._elements.cells.children[Math.trunc(index)];
    }


    /**
     * Get the cell HtmlElement from pointer absolute position
     * @param x {number}
     * @param y {number}
     * @returns {HTMLElement|null}
     */
    get_cell_from_pointer(x, y) {
        const bounds = this._elements.cells.getBoundingClientRect();
        if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom)
            return null;
        let daily_subdivision = (this._daily_end - this._daily_start) / this._daily_spacing;
        const index = Math.trunc((y - bounds.top) / bounds.height * daily_subdivision);
        return this._elements.cells.children[index];
    }

    _update_events() {
        if (!this.isConnected)
            return;

        while (this._elements.events.children.length > 0)
            this._elements.events.children[this._elements.events.children.length - 1].remove();

        if (!this._even_pool)
            return;
        this._event_divs.clear();
        for (const event of this._even_pool.get_day_events(this._date))
            this._add_event(event);
    }

    /**
     * @param sorted_event {SortedEvent}
     * @private
     */
    _add_event(sorted_event) {
        const event = sorted_event.event;

        const day_display_start = new Date(this._date);
        day_display_start.setHours(0, 0, 0, this._daily_start);
        if (event.end_time < day_display_start)
            return;

        const indent = sorted_event.indentation;
        const num_indent = sorted_event.num_indentations;

        const hmin = (indent / num_indent) * 0.95;
        const hmax = ((indent + 1) / num_indent) * 0.95;
        let vmin = Math.max(0, (event.start_time - this._date - this._daily_start) / (this._daily_end - this._daily_start));
        let vmax = Math.min(1, (event.end_time - this._date - this._daily_start) / (this._daily_end - this._daily_start));
        const event_div = require('./calendar_event.hbs')({title: event.title.plain()}, {
            select: async () => {
                await this._selector.select_event(event.id);
            }
        });
        event_div.style.backgroundColor = numberToColorHSL(event.owner);
        event_div.style.top = `${vmin * 100}%`;
        event_div.style.bottom = `${(1 - vmax) * 100}%`;
        event_div.style.left = `${hmin * 100}%`;
        event_div.style.right = `${(1 - hmax) * 100}%`;
        this._event_divs.set(event.id, event_div);
        this._elements.events.append(event_div);
    }

    /**
     * @param event_pool {EventPool}
     */
    set_event_source(event_pool) {
        if (this._even_pool === event_pool)
            return;
        this._even_pool = event_pool;

        this._add_event_cb = event_pool.events.add('add', (_) => {
            this._update_events();
        })
        this._remove_event_cb = event_pool.events.add('remove', (_) => {
            this._update_events();
        })
        this._update_events();
    }
}

customElements.define("calendar-day", CalendarDay);