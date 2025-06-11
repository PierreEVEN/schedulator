require('./clock')

class CalendarTimePicker extends HTMLElement {
    constructor() {
        super();
        if (!this._hour)
            this._hour = 0;
        if (!this._minute)
            this._minute = 0;
        this._mode_hours = true;
    }

    connectedCallback() {
        this.classList.add('calendar-datetime-picker')


        const callbacks = {};

        const widgets = require('./time_picker.hbs')({
            h: String(this.hour).padStart(2, '0'),
            mn: String(this.minute).padStart(2, '0')
        }, callbacks);
        this._elements = widgets.hb_elements;

        callbacks.mode_hours = () => {
            this._set_mode_hours();
        };
        callbacks.mode_minutes = () => {
            this._set_mode_minutes();
        };
        callbacks.onvalidate = () => {
            if (this.onset)
                this.onset({target: this});
        };
        callbacks.oncancel = () => {
            if (this.oncancel)
                this.oncancel();
        };

        this._elements.clock.has_inner = true;

        this._elements.clock.onchange = (event) => {
            if (this._mode_hours) {
                this.hour = event.target.value;
                this._elements.hours.innerText = String(event.target.value).padStart(2, '0');
                if (event.submit)
                    callbacks.mode_minutes();
            } else {
                this.minute = event.target.value;
            }
        }

        for (const widget of widgets)
            this.append(widget)
    }

    _set_mode_hours() {
        this._mode_hours = true;
        this._elements.clock.max = 12;
        this._elements.clock.spacing = 1;
        this._elements.clock.has_inner = true;
        this._elements.clock.rebuild_clock();
        this._elements.clock.value = this.hour;
        this._elements.hours.classList.add('calendar-dt-picker-selected')
        this._elements.minutes.classList.remove('calendar-dt-picker-selected')
    }

    _set_mode_minutes() {
        this._mode_hours = false;
        this._elements.clock.max = 60;
        this._elements.clock.spacing = 5;
        this._elements.clock.has_inner = false;
        this._elements.clock.rebuild_clock();
        this._elements.clock.value = this.minute;
        this._elements.minutes.classList.add('calendar-dt-picker-selected')
        this._elements.hours.classList.remove('calendar-dt-picker-selected')
    }

    set hour(value) {
        this._hour = value;
        if (this.isConnected)
            this._elements.hours.innerText = String(value).padStart(2, '0');
        if (this._mode_hours)
            this._elements.clock.value = this.hour;
    }

    get hour() {
        return this._hour;
    }

    set minute(value) {
        this._minute = value;
        if (this.isConnected)
            this._elements.minutes.innerText = String(value).padStart(2, '0');
        if (!this._mode_hours)
            this._elements.clock.value = this.minute;
    }

    get minute() {
        return this._minute;
    }
}

customElements.define("calendar-time-picker", CalendarTimePicker);