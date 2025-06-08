import './datetime_input.scss'

class CalendarDateTimeInput extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {Date}
         */
        this._set_value(this.value || new Date(Date.now()));

        if (this.hasAttribute('value'))
            this._set_value(this.getAttribute('value'));

        this.has_time = !this.hasAttribute('no_time');
        this.has_date = !this.hasAttribute('no_date');
        this.has_year = this.hasAttribute('has_year');
    }

    _open_edit_modal(widget) {
        this._close_edit_modal();
        this.modal = document.createElement('div');
        this.modal.classList.add('calendar-dt-picker-container');
        this.modal.append(widget);
        document.body.append(this.modal);
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
                this._open_edit_modal(require('./time_picker.hbs')({}, {}))
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
        this._set_value(value);
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
     * @private
     */
    _set_value(value) {
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
        if (this.onchange) {
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