require('./calendar_day.scss')
const {numberToColorHSL} = require("../../../utilities/colors");
const {ONE_MIN_MS, ONE_DAY_MS} = require("../../../utilities/time_utils");

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
        this.spacing = spacing;
        this._update_display();
    }

    connectedCallback() {
        this._update_display();
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
            this._date = new_date;
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

        this._elements = require('./calendar_day.hbs')({
            today: this._date.getTime() === now.getTime(),
            day: this._date.toLocaleDateString(undefined, {weekday: 'short'}),
            num: this._date.getDate()
        });
        for (const element of this._elements)
            this.append(element);

        let daily_subdivision = (this._daily_end - this._daily_start) / this._daily_spacing;
        for (let i = 0; i < daily_subdivision; ++i) {
            let cell_time_start = new Date(this._date.getTime() + this._daily_start + i * this._daily_spacing);
            let cell_time_end = new Date(this._date.getTime() + this._daily_start + (i + 1) * this._daily_spacing);
            let cell = require('./calendar_cell.hbs')({content: ""});
            cell.cell_time_start = cell_time_start;
            cell.cell_time_end = cell_time_end;
            cell.onclick = async () => {

            }
            this._elements[0].elements.cells.append(cell);
        }

        this._update_events();
    }

    _update_events() {
        if (!this.isConnected)
            return;

        while (this._elements[0].elements.events.children.length > 0)
            this._elements[0].elements.events.children[this._elements[0].elements.events.children.length - 1].remove();

        if (!this._even_pool)
            return;
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
        const event_div = require('./calendar_event.hbs')({title: event.title.plain()}, {})

        event_div.style.backgroundColor = numberToColorHSL(event.owner);
        event_div.style.top = `${vmin * 100}%`;
        event_div.style.bottom = `${(1 - vmax) * 100}%`;
        event_div.style.left = `${hmin * 100}%`;
        event_div.style.right = `${(1 - hmax) * 100}%`;

        this._elements[0].elements.events.append(event_div)
    }

    /**
     * @param event_pool {EventPool}
     */
    set_event_source(event_pool) {
        if (this._even_pool === event_pool)
            return;
        this._even_pool = event_pool;

        this._add_event_cb = event_pool.events.add('add', (_) => {

        })
        this._remove_event_cb = event_pool.events.add('remove', (_) => {

        })
        this._update_events();
    }
}

customElements.define("calendar-day", CalendarDay);