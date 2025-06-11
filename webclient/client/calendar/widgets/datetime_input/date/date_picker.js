require('./date_picker.scss')

class CalendarDatePicker extends HTMLElement {
    constructor() {
        super();

        if (!this.value)
            this._value_date = new Date(Date.now());
        this._display_date = new Date(this._value_date);
    }

    connectedCallback() {
        this.classList.add('calendar-datetime-picker')
        const widgets = require('./date_picker.hbs')({}, {
            next_month: () => {
                this._display_date.setMonth(this._display_date.getMonth() + 1);
                this._update_content();
            },
            prev_month: () => {
                this._display_date.setMonth(this._display_date.getMonth() - 1);
                this._update_content();
            }
        });
        for (const widget of widgets)
            this.append(widget)
        this.elements = widgets.hb_elements;


        for (let m = 0; m < 12; ++m) {
            const item = document.createElement('option');
            const title_date = new Date();
            title_date.setMonth(m);
            item.innerText = title_date.toLocaleDateString(undefined, {month: 'long'});
            item.value = m.toString();
            this.elements.months.append(item);
        }
        this.elements.months.onchange = (event) => {
            if (event.target.value === this._display_date.getMonth())
                return;
            this._display_date.setMonth(event.target.value);
            this._update_content();
        }

        for (let m = this._display_date.getFullYear() - 20; m < this._display_date.getFullYear() + 20; ++m) {
            const item = document.createElement('option');
            item.innerText = m.toString();
            item.value = m.toString();
            this.elements.years.append(item);
        }
        this.elements.years.onchange = (event) => {
            if (event.target.value === this._display_date.getFullYear())
                return;
            this._display_date.setFullYear(event.target.value);
            this._update_content();
        }


        this._update_content();
    }

    set value(value) {
        this._value_date = new Date(value);
        this._display_date = new Date(this._value_date);
        this._update_content();
    }

    get value() {
        return this._value_date;
    }

    _update_content() {
        if (!this.isConnected)
            return;

        this._display_date.setHours(0, 0, 0, 0);
        let start_date = new Date(this._display_date);
        start_date.setDate(1);
        start_date.setDate(start_date.getDate() - ((start_date.getDay() + 6) % 7));

        this.elements.months.value = this._display_date.getMonth();
        this.elements.years.value = this._display_date.getFullYear();

        this.elements.titles.innerHTML = '';
        for (let d = 0; d < 7; ++d) {
            const item = document.createElement('p');
            const title_date = new Date(start_date);
            title_date.setDate(title_date.getDate() + d);
            item.innerText = title_date.toLocaleDateString(undefined, {weekday: 'short'}).substring(0, 3);
            this.elements.titles.append(item);
        }

        const today = new Date(Date.now());
        today.setHours(0, 0, 0, 0);

        let value_date_zero = new Date(this._value_date);
        value_date_zero.setHours(0, 0, 0, 0);

        this.elements.table.innerHTML = '';
        let in_month = false;
        for (let w = 0; w < 6; ++w) {
            for (let d = 0; d < 7; ++d) {
                const item = document.createElement('button');
                const date = start_date.getDate();
                if (date === 1) {
                    in_month = !in_month;
                }
                if (!in_month)
                    item.style.color = 'gray';
                if (value_date_zero.getTime() === start_date.getTime())
                    item.classList.add('calendar-dp-select');
                else if (today.getTime() === start_date.getTime())
                    item.style.color = 'cyan';
                item.innerText = date.toString();
                const result_date = new Date(start_date);
                item.onclick = () => {
                    this._value_date = result_date;
                    if (this.onset)
                        this.onset({target: this});
                }
                start_date.setDate(start_date.getDate() + 1);
                this.elements.table.append(item);
            }
        }
    }
}

customElements.define("calendar-date-picker", CalendarDatePicker);