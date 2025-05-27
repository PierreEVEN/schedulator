import {ONE_DAY_MS, ONE_HOUR_MS, ONE_MIN_MS, time_format_from_ms} from "../../utilities/time_utils";
import './day/calendar_day'


require('./calendar_body.scss')

class CalendarBody extends HTMLElement {
    constructor() {
        super();

        /**
         * Daily start in ms
         * @type {number}
         * @private
         */
        this._daily_start = 60 * 60 * 1000 * 6; // 6h
        if (this.hasAttribute('daily-start'))
            this._daily_start = Number(this.getAttribute('daily-start'));
        /**
         * Daily end in ms
         * @type {number}
         * @private
         */
        this._daily_end = 60 * 60 * 1000 * 20; // 20h
        if (this.hasAttribute('daily-end'))
            this._daily_end = Number(this.getAttribute('daily-end'));
        /**
         * Minimum time interval in ms
         * @type {number}
         * @private
         */
        this._daily_spacing = 30 * 60 * 1000; // 30 minutes
        if (this.hasAttribute('spacing'))
            this._daily_spacing = Number(this.getAttribute('spacing'));

        /**
         * @type {number}
         * @private
         */
        this._display_days = 7;
        if (this.hasAttribute('display-days'))
            this._display_days = Number(this.getAttribute('display-days'));

        /**
         * @type {Date}
         * @private
         */
        this._display_date = new Date(Date.now())
        if (this.hasAttribute('display-date'))
            this._display_date = new Date(this.getAttribute('display-date'));

        /**
         * @type {Selector}
         * @private
         */
        this._selector = null;
    }

    connectedCallback() {
        this._refresh_calendar();
    }

    /**
     * @param selector {Selector}
     */
    set_selector(selector) {
        this._selector = selector;
        if (this.isConnected)
            for (const element of this._elements['columns'].children)
                element.set_selector(selector);
    }

    /**
     * @param date {Date}
     */
    set_display_date(date) {
        const new_date = new Date(date)
        const days = new_date.getDay();
        new_date.setDate(new_date.getDate() - (days === 0 ? 6 : days - 1));
        if (new_date.getTime() === this._display_date.getTime())
            return;
        this._display_date = new_date;
        this._refresh_calendar();
    }

    _refresh_calendar() {
        if (!this.isConnected)
            return;
        while (this.children.length > 0)
            this.children[this.children.length - 1].remove();

        const elements = require('./calendar_body.hbs')();
        for (const element of elements)
            this.append(element);
        this._elements = elements[0].elements;

        let daily_subdivision = (this._daily_end - this._daily_start) / this._daily_spacing
        for (let i = 0; i < daily_subdivision; ++i) {
            let time = this._daily_start + i * this._daily_spacing;
            let value = ""
            if (this._daily_spacing / ONE_HOUR_MS === 0.5) {
                if (time % ONE_HOUR_MS === 0.0)
                    value = time_format_from_ms(time, false);
            } else if (this._daily_spacing / ONE_HOUR_MS === 0.25) {
                if (time % (ONE_HOUR_MS / 2) === 0.0)
                    value = time_format_from_ms(time, time % ONE_HOUR_MS !== 0);
            } else if (this._daily_start / ONE_HOUR_MS === 1.0)
                value = time_format_from_ms(time, false);
            this._elements['rows_header'].append(require('./calendar_row_header.hbs')({time: value}))
        }

        for (let i = 0; i < this._display_days; i++) {
            let this_day = new Date(this._display_date);
            this_day.setDate(this._display_date.getDate() + i);
            /**
             * @type {CalendarDay}
             */
            const day = document.createElement('calendar-day');
            day.set_date(this_day);
            day.set_range(this._daily_start, this._daily_end, this._daily_spacing);
            day.set_event_source(this._event_pool);
            day.set_selector(this._selector);
            this._elements['columns'].append(day);
        }
    }

    /**
     * @param in_event_pool {EventPool}
     */
    set_event_source(in_event_pool) {
        this._event_pool = in_event_pool;
        if (!this.isConnected)
            return;
        for (const element of this._elements['columns'].children)
            element.set_event_source(this._event_pool);
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
        if (!this.isConnected)
            return;
        for (const element of this._elements['columns'].children)
            element.set_range(this._daily_start, this._daily_end, this._daily_spacing);
    }
}

customElements.define("calendar-body", CalendarBody);