import './datetime_input.scss'

class CalendarDateTimeInput extends HTMLElement {
    constructor() {
        super();

        /**
         * @type {Date}
         */
        this.value = new Date(Date.now());
        if (this.hasAttribute('value'))
            this.value = new Date(this.getAttribute('value'));
    }

    connectedCallback() {
        const widgets = require('./datetime_input.hbs')({
            year: this.value.getFullYear(),
            day: this.value.toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                hour12: false,
            }),
            hour: String(this.value.getHours()).padStart(2, '0'),
            minutes: String(this.value.getMinutes()).padStart(2, '0')
        }, {});
        for (const widget of widgets)
            this.append(widget);
    }
}

customElements.define("calendar-date-time-input", CalendarDateTimeInput);