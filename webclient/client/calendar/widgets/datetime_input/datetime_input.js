import './datetime_input.scss'
import {ONE_HOUR_MS, ONE_MIN_MS} from "../../../utilities/time_utils";

require('./clock/clock')
require('./date/date_picker')

class CalendarDateTimeInput extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {Date}
         */
        this._set_value(this.value || new Date(Date.now()), false);

        if (this.hasAttribute('value'))
            this._set_value(this.getAttribute('value'), false);

        this.has_time = !this.hasAttribute('no_time');
        this.has_date = !this.hasAttribute('no_date');
        this.has_year = this.hasAttribute('has_year');

        document.addEventListener('pointerup', (event) => {
            const parent = event.target.closest('calendar-date-time-input');
            const modal = event.target.closest('.calendar-dt-picker-container');
            if (modal !== this.modal && parent !== this)
                this._close_edit_modal();
        })
    }

    _open_edit_modal(widget, event) {
        this._close_edit_modal();
        this.modal = document.createElement('div');
        this.modal.classList.add('calendar-dt-picker-container');
        this.modal.append(widget);
        this.modal.onpointerup = (event) => {
            if (!event.target.closest('.calendar-time-picker'))
                this._close_edit_modal();
        }
        document.body.append(this.modal);
        if (event.pointerId === 0) {
            const target_bounds = event.target.getBoundingClientRect();
            const widget_bounds = widget.getBoundingClientRect();
            widget.style.left = `${Math.min(target_bounds.left, window.innerWidth - widget_bounds.width - 20)}px`;
            widget.style.top = `${Math.min(target_bounds.top, window.innerHeight - widget_bounds.height - 20)}px`;
        } else
            this.modal.classList.add('calendar-dt-picker-mobile');
    }

    _close_edit_modal(widget) {
        if (this.modal)
            this.modal.remove();
        this.modal = null;
    }

    connectedCallback() {
        if (!this.has_time)
            this.classList.add('calendar-dt-notime');
        const widgets = require('./datetime_input.hbs')({
            has_date: this.has_date,
            has_time: this.has_time,
            has_year: this.has_year,
            has_sep: this.has_date && this.has_time
        }, {
            edit_time: (event) => {
                event.preventDefault();
                let hours = this._date_value ? this._date_value.getHours() : Math.trunc(this._ms_value / ONE_HOUR_MS);
                let minutes = this._date_value ? this._date_value.getMinutes() : Math.trunc(this._ms_value / ONE_MIN_MS);
                let mode_hours = true;

                const callbacks = {};

                const time_picker_modal = require('./time_picker.hbs')({
                    h: String(hours).padStart(2, '0'),
                    mn: String(minutes).padStart(2, '0')
                }, callbacks);
                callbacks.mode_hours = () => {
                    mode_hours = true;
                    time_picker_modal.hb_elements.clock.max = 12;
                    time_picker_modal.hb_elements.clock.spacing = 1;
                    time_picker_modal.hb_elements.clock.has_inner = true;
                    time_picker_modal.hb_elements.clock.rebuild_clock();
                    time_picker_modal.hb_elements.clock.value = hours;
                    time_picker_modal.hb_elements.hours.classList.add('calendar-dt-picker-selected')
                    time_picker_modal.hb_elements.minutes.classList.remove('calendar-dt-picker-selected')
                };
                callbacks.mode_minutes = () => {
                    mode_hours = false;
                    time_picker_modal.hb_elements.clock.max = 60;
                    time_picker_modal.hb_elements.clock.spacing = 5;
                    time_picker_modal.hb_elements.clock.has_inner = false;
                    time_picker_modal.hb_elements.clock.rebuild_clock();
                    time_picker_modal.hb_elements.clock.value = minutes;
                    time_picker_modal.hb_elements.minutes.classList.add('calendar-dt-picker-selected')
                    time_picker_modal.hb_elements.hours.classList.remove('calendar-dt-picker-selected')
                };
                callbacks.onvalidate = () => {
                    if (this._date_value) {
                        const date = new Date(this._date_value);
                        date.setHours(hours, minutes, 0, 0);
                        this._set_value(date, true);
                        this._close_edit_modal();
                    } else
                        this._set_value(this._ms_value = hours * ONE_HOUR_MS + minutes * ONE_MIN_MS, true);
                };
                callbacks.oncancel = () => {
                    this._close_edit_modal();
                };

                time_picker_modal.hb_elements.clock.has_inner = true;

                this._open_edit_modal(time_picker_modal, event);

                time_picker_modal.hb_elements.clock.value = hours;
                time_picker_modal.hb_elements.clock.onchange = (event) => {
                    if (mode_hours) {
                        hours = event.target.value;
                        time_picker_modal.hb_elements.hours.innerText = String(event.target.value).padStart(2, '0');
                        if (event.submit)
                            callbacks.mode_minutes();
                    } else {
                        minutes = event.target.value;
                        time_picker_modal.hb_elements.minutes.innerText = String(event.target.value).padStart(2, '0');
                    }
                }
            },
            edit_date: (event) => {
                const picker = document.createElement('calendar-date-picker');
                picker.onset = (event) => {
                    const date = new Date(this._date_value);
                    date.setFullYear(event.target.value.getFullYear());
                    date.setMonth(event.target.value.getMonth());
                    date.setDate(event.target.value.getDate());
                    this._set_value(date, true);
                    this._close_edit_modal();
                }
                this._open_edit_modal(picker, event);
                picker.value = this._date_value;
            },
            edit_year: (event) => {

            }
        });
        this._elements = widgets.hb_elements;
        this._update_elements();
        if (widgets.length)
            for (const widget of widgets)
                this.append(widget);
        else
            this.append(widgets);
    }

    set value(value) {
        this._set_value(value, false);
    }

    get value() {
        return this._date_value ? this._date_value : this._ms_value;
    }

    /**
     * @param value {String|Date|number}
     * @private
     */
    _as_time_ms(value) {
        if (typeof value === 'string') {
            const split = value.split(':')
            if (split.length === 2 && !isNaN(Number(split[0])) && !isNaN(Number(split[1])))
                return Number(split[0]) * 3600000 + Number(split[1]) * 60000;
        } else if (!isNaN(Number(value)) && Number(value) <= 3600000 * 24)
            return Number(value);
        return null;
    }

    /**
     * Set date or time (hh:mm)
     * @param value {String|Date|number}
     * @param from_user {boolean}
     * @private
     */
    _set_value(value, from_user = true) {
        const time = this._as_time_ms(value);
        if (time) {
            if (this._ms_value && this._ms_value === time)
                return;
            this._ms_value = time;
            this._date_value = null;
        } else {
            if (this._date_value && this._date_value.getTime() === new Date(value).getTime())
                return;
            this._date_value = new Date(value);
            this._ms_value = null;
        }
        this._update_elements();
        if (this.onchange && from_user) {
            this.onchange({target: this})
        }
    }

    _update_elements() {
        if (!this._elements)
            return;
        if (this._elements.date)
            this._elements.date.innerText = this._date_value ? this._date_value.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour12: false,
            }).toUpperCase() : '';
        if (this._elements.year)
            this._elements.year.innerText = this._date_value ? this._date_value.toLocaleDateString(undefined, {year: 'numeric'}) : '';
        if (this._elements.time)
            this._elements.time.innerText = this._date_value ?
                String(this._date_value.getHours()).padStart(2, '0') + ":" + String(this._date_value.getMinutes()).padStart(2, '0') :
                String(Math.trunc(this._ms_value / 3600000)).padStart(2, '0') + ":" + String(Math.trunc(this._ms_value / 60000) - Math.trunc(this._ms_value / 3600000) * 60).padStart(2, '0');
    }

}

customElements.define("calendar-date-time-input", CalendarDateTimeInput);