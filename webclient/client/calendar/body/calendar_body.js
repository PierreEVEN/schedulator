import {ONE_DAY_MS, ONE_HOUR_MS, time_format_from_ms} from "../../utilities/time_utils";
import './day/calendar_day'


require('./calendar_body.scss')

class CalendarBody extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {CalendarApp}
         */
        this.parent = null;

        /**
         * Daily start in ms
         * @type {number}
         */
        this.daily_start = 60 * 60 * 1000 * 6; // 6h
        /**
         * Daily end in ms
         * @type {number}
         */
        this.daily_end = 60 * 60 * 1000 * 20; // 20h
        /**
         * Minimum time interval in ms
         * @type {number}
         */
        this.daily_spacing = 30 * 60 * 1000; // 30 minutes

        /**
         * @type {number}
         */
        this.display_days = 7;

        /**
         * @type {Date}
         */
        this.display_start = new Date(Date.now())

        if (this.hasAttribute('daily-start'))
            this.daily_start = Number(this.getAttribute('daily-start'));
        if (this.hasAttribute('daily-end'))
            this.daily_end = Number(this.getAttribute('daily-end'));
        if (this.hasAttribute('spacing'))
            this.daily_spacing = Number(this.getAttribute('spacing'));
        if (this.hasAttribute('display-start'))
            this.display_start = new Date(this.getAttribute('display-start'));
        if (this.hasAttribute('display-days'))
            this.display_days = Number(this.getAttribute('display-days'));
    }

    connectedCallback() {
        this._refresh_calendar();
    }

    _refresh_calendar() {
        if (this._elements)
            for (const element of this._elements)
                element.remove();
        this._elements = null;

        this._elements = require('./calendar_body.hbs')();

        let daily_subdivision = (this.daily_end - this.daily_start) / this.daily_spacing
        for (let i = 0; i < daily_subdivision; ++i) {
            let time = this.daily_start + i * this.daily_spacing;
            let value = ""
            if (this.daily_spacing / ONE_HOUR_MS === 0.5) {
                if (time % ONE_HOUR_MS === 0.0)
                    value = time_format_from_ms(time, false);
            } else if (this.daily_spacing / ONE_HOUR_MS === 0.25) {
                if (time % (ONE_HOUR_MS / 2) === 0.0)
                    value = time_format_from_ms(time, time % ONE_HOUR_MS !== 0);
            } else if (this.daily_start / ONE_HOUR_MS === 1.0)
                value = time_format_from_ms(time, false);
            this._elements[0].elements['rows_header'].append(require('./calendar_row_header.hbs')({time: value}))
        }


        for (let i = 0; i < this.display_days; i++) {
            let this_day = new Date(this.display_start);
            this_day.setDate(this.display_start.getDate() + i);
            const day = document.createElement('calendar-day');
            day.set_date(this_day);
            day.set_event_source(this._event_pool);
            this._elements[0].elements['columns'].append(day);
        }

        for (const element of this._elements)
            this.append(element)
    }

    /**
     * @param in_event_pool {EventPool}
     */
    set_event_source(in_event_pool) {
        this._event_pool = in_event_pool;
        this._refresh_all_events();
    }

    _refresh_all_events() {

        if (!this._event_pool)
            return;

        for (let i = 0; i < this.display_days; i++) {
            let this_day = new Date(this.display_start);
            this_day.setDate(this.display_start.getDate() + i);
            this.display_day_events(this_day);
        }
    }

    display_day_events(date) {
        if (!this._elements)
            return;
        const day_midnight_time = new Date(date);
        day_midnight_time.setHours(0, 0, 0, 0);

        const day_display_start = new Date(day_midnight_time);
        day_display_start.setHours(0, 0, 0, this.daily_start);

        const events = this._event_pool.get_day_events(day_midnight_time);

        /** Actually display the events **/
        for (const event_data of events) {
            const event = event_data.event;
            const indent = event_data.indentation;
            const num_indent = event_data.num_indentations;
            // Get first displayed day at 00:00
            const display_start = new Date(this.display_start);
            display_start.setHours(0, 0, 0, 0);


            if (event.end_time < day_display_start)
                continue;

            const cell_start = Math.trunc((day_midnight_time - display_start) / ONE_DAY_MS);

            const hmin = (((Math.trunc((day_midnight_time - display_start) / ONE_DAY_MS) + (indent) / num_indent) - cell_start) * 0.95 + cell_start) / this.display_days;
            const hmax = (((Math.trunc((day_midnight_time - display_start) / ONE_DAY_MS) + (indent + 1) / num_indent) - cell_start) * 0.95 + cell_start) / this.display_days;
            let vmin = Math.max(0, (event.start_time - day_midnight_time - this.daily_start) / this.day_duration());
            let vmax = Math.min(1, (event.end_time - day_midnight_time - this.daily_start) / this.day_duration());
            const event_div = require('./day/calendar_event.hbs')({title: event.title.plain()}, {})

            function valueToColor(value, min = -10, max = 10) {
                const clamped = Math.max(min, Math.min(max, value));
                const percent = (clamped - min) / (max - min);
                const hue = percent * 120;
                return `hsl(${hue}, 50%, 70%)`;
            }

            function numberToColorHSL(n, total = 10) {
                const hue = ((n + 97.58) * (398787.4713 / total)) % 360;
                return `hsl(${hue}, 70%, 50%)`;
            }

            const user_color = numberToColorHSL(event.owner);
            //event_div.elements.event_presence.style.backgroundColor = valueToColor(event.presence);
            event_div.style.backgroundColor = user_color;
            event_div.style.top = `${vmin * 100}%`;
            event_div.style.bottom = `${(1 - vmax) * 100}%`;
            event_div.style.left = `${hmin * 100}%`;
            event_div.style.right = `${(1 - hmax) * 100}%`;

            this._elements[0].elements.rows.append(event_div)
        }
    }
}

customElements.define("calendar-body", CalendarBody);