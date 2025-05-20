require('./calendar_app.scss');

class Mode {
}

class ModeWeek extends Mode {

    get_columns() {
        return [
            {title: "Lundi"},
            {title: "Mardi"},
            {title: "Mercredi"},
            {title: "Jeudi"},
            {title: "Vendredi"},
            {title: "Samedi"},
            {title: "Dimanche"}
        ]
    }
}

function time_format_from_ms(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const seconds = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function get_week_number(date) {
    const target = new Date(date.valueOf());

    // Set to Thursday of the current week
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));

    // January 4th is always in week 1 (ISO rule)
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));

    return 1 + Math.round(
        ((target - firstThursday) / 86400000 - 3) / 7
    );
}

let GLOBAL_EVENT_CREATOR = null;

class CalendarApp extends HTMLElement {
    constructor() {
        super();

        this.mode = new ModeWeek()

        this.events = [];

        this.daily_start = new Date(60 * 60 * 1000 * 6); // 6h
        this.daily_end = new Date(60 * 60 * 1000 * 20); // 20h
        this.end = new Date(Date.now());
        this.start = new Date(new Date().setMonth(new Date(this.end).getMonth() - 3));
        this.daily_spacing = new Date(30 * 60 * 1000); // 30 minutes

        this.classList.add('calendar-app');

        this.addEventListener('mousemove', (event) => {
            this.mouse_x = event.clientX;
            this.mouse_y = event.clientY;
        });

        if (this.hasAttribute('daily-start')) {
            this.daily_start = this.getAttribute('daily-start')
        }
        if (this.hasAttribute('daily-end')) {
            this.daily_end = this.getAttribute('daily-end')
        }
        if (this.hasAttribute('start')) {
            this.start = this.getAttribute('start')
        }
        if (this.hasAttribute('end')) {
            this.end = this.getAttribute('end')
        }
        if (this.hasAttribute('spacing')) {
            this.daily_spacing = this.getAttribute('spacing')
        }

        this.display_start = new Date(new Date().setMonth(new Date(this.end).getMonth() - 1));

        this._refresh_calendar();
    }

    _refresh_calendar() {
        if (this._calendar_object)
            this._calendar_object.remove();
        this._calendar_object = null;

        this._calendar_object = require('./calendar_app.hbs')({
            week_number: get_week_number(this.display_start),
            year: this.display_start.getFullYear(),
            month: this.display_start.toLocaleDateString(undefined, {month: 'long'})
        }, {
            next_week: () => {
                this.display_start.setDate(this.display_start.getDate());
                this._refresh_calendar();
            },
            previous_week: () => {
                this.display_start.setDate(this.display_start.getDate() - 14)
                this._refresh_calendar();
            }
        });

        let daily_subdivision = (this.daily_end.getTime() - this.daily_start.getTime()) / this.daily_spacing.getTime()

        for (let j = 0; j < daily_subdivision; j++) {
            let time = this.daily_start.getTime() + j * this.daily_spacing.getTime();
            this._calendar_object.elements.column_header.append(require('./calendar_column_header_cell.hbs')({value: time_format_from_ms(time)}))
        }

        for (let i = 0; i < 7; ++i) {

            let start_of_day = new Date(this.display_start);
            start_of_day.setHours(0, 0, 0, 0);

            let column = require('./calendar_column.hbs')({title: start_of_day.toLocaleDateString(undefined, {weekday: 'long'}) + " " + start_of_day    .getDate()});


            for (let j = 0; j < daily_subdivision; j++) {


                let cell_time_start = new Date(start_of_day.getTime() + this.daily_start.getTime() + j * this.daily_spacing.getTime());
                let cell_time_end = new Date(start_of_day.getTime() + this.daily_start.getTime() + (j + 1) * this.daily_spacing.getTime());

                let cell = require('./calendar_cell.hbs')({content: cell_time_start});
                cell.cell_time_start = cell_time_start;
                cell.cell_time_end = cell_time_end;
                cell.onclick = () => {
                    this.spawn_add_event()
                }


                column.elements.cells.append(cell)
            }
            this._calendar_object.elements.columns.append(column);


            this.display_start.setDate(this.display_start.getDate() + 1)
        }

        this.append(this._calendar_object)
    }

    add_event(config) {
        this.events.push(config);
    }

    spawn_add_event() {
        if (GLOBAL_EVENT_CREATOR)
            GLOBAL_EVENT_CREATOR.remove();
        GLOBAL_EVENT_CREATOR = null;

        GLOBAL_EVENT_CREATOR = require('./create_event.hbs')()
        this.append(GLOBAL_EVENT_CREATOR);

        const popupWidth = GLOBAL_EVENT_CREATOR.offsetWidth;
        const popupHeight = GLOBAL_EVENT_CREATOR.offsetHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let left = this.mouse_x;
        let top = this.mouse_y;

        if (left + popupWidth > screenWidth) {
            left = screenWidth - popupWidth;
        }
        if (top + popupHeight > screenHeight) {
            top = screenHeight - popupHeight;
        }

        GLOBAL_EVENT_CREATOR.style.left = left + 'px'
        GLOBAL_EVENT_CREATOR.style.top = top + 'px'
    }
}

customElements.define("calendar-app", CalendarApp);


export {CalendarApp}