import {fetch_api} from "../utilities/request";
import {EncString} from "../utilities/encstring";
import {Message, NOTIFICATION} from "../views/message_box/notification";
import {APP_CONFIG} from "../utilities/app_config";
import {Authentication} from "../utilities/authentication/authentication";
import {PlanningUser} from "../utilities/planning_user";

require('./calendar_app.scss');

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

        this.events = [];

        this.daily_start = 60 * 60 * 1000 * 6; // 6h
        this.daily_end = 60 * 60 * 1000 * 20; // 20h
        this.end = new Date(Date.now());
        this.start = new Date(new Date().setMonth(new Date(this.end).getMonth() - 3));
        this.daily_spacing = 30 * 60 * 1000; // 30 minutes

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

        this.selection = [];
    }

    connectedCallback() {
        this.classList.add('calendar-app');
    }

    _refresh_calendar() {
        if (this._calendar_object)
            this._calendar_object.remove();
        this._calendar_object = null;

        this._calendar_object = require('./calendar_app.hbs')({
            title: this._planning.title.plain(),
            week_number: get_week_number(this.display_start),
            year: this.display_start.getFullYear(),
            month: this.display_start.toLocaleDateString(undefined, {month: 'long'})
        }, {
            next_week: () => {
                this.display_start.setDate(this.display_start.getDate() + 7);
                this._refresh_calendar();
            },
            previous_week: () => {
                this.display_start.setDate(this.display_start.getDate() - 7)
                this._refresh_calendar();
            }
        });

        let daily_subdivision = (this.daily_end - this.daily_start) / this.daily_spacing

        this._calendar_object.elements.columns_header.append(require('./calendar_column_header.hbs')())
        for (let i = 0; i < 7; i++) {
            let this_day = new Date(this.display_start);
            this_day.setDate(this.display_start.getDate() + i)
            this._calendar_object.elements.columns_header.append(require('./calendar_column_header.hbs')({title: this_day.toLocaleDateString(undefined, {weekday: 'short'}) + " " + this_day.getDate()}));
        }

        for (let i = 0; i < daily_subdivision; ++i) {
            let time = this.daily_start + i * this.daily_spacing;
            this._calendar_object.elements.rows_header.append(require('./calendar_row_header.hbs')({time: time_format_from_ms(time)}))
        }

        for (let i = 0; i < daily_subdivision; ++i) {

            const row = document.createElement('div');
            row.classList.add('calendar-row')

            let start_of_day = new Date(this.display_start.getTime());
            start_of_day.setHours(0, 0, 0, 0);
            for (let j = 0; j < 7; j++) {

                start_of_day.setDate(this.display_start.getDate() + j)

                let cell_time_start = new Date(start_of_day.getTime() + this.daily_start + i * this.daily_spacing);
                let cell_time_end = new Date(start_of_day.getTime() + this.daily_start + (i + 1) * this.daily_spacing);
                let cell = require('./calendar_cell.hbs')({content: ""});
                cell.cell_time_start = cell_time_start;
                cell.cell_time_end = cell_time_end;
                cell.onclick = async () => {
                    this.selection = []
                    this.selection.push(cell);
                    await this.spawn_add_event();
                }

                row.append(cell)
            }
            this._calendar_object.elements.rows.append(row);
        }

        this.append(this._calendar_object)
        this._modal_container = this._calendar_object.elements.modal_container;
    }

    add_event(config) {
        this.events.push(config);
        const display_start = new Date(this.display_start);
        display_start.setHours(0, 0, 0, 0);
        const start = new Date(config.start_time);
        const end = new Date(config.end_time);

        const event_dail_start = new Date(start);
        event_dail_start.setHours(0, 0, 0, 0);
        const daily_span = this.daily_end - this.daily_start;

        let vmin = (start - event_dail_start - this.daily_start) / daily_span;
        let vmax = (end - event_dail_start - this.daily_start) / daily_span;
        const hmin = Math.trunc((start - display_start) / (1000 * 60 * 60 * 24)) / 7;
        const hmax = Math.trunc((start - display_start) / (1000 * 60 * 60 * 24) + 1) / 7;
        const event = require('./calendar_event.hbs')({title: new EncString(config.title).plain()}, {})

        function valueToColor(value, min = -10, max = 10) {
            const clamped = Math.max(min, Math.min(max, value));
            const percent = (clamped - min) / (max - min);
            const hue = percent * 120;
            return `hsl(${hue}, 50%, 70%)`;
        }

        function numberToColorHSL(n, total = 10) {
            const hue = ((n +97.58) * (398787.4713 / total)) % 360;
            return `hsl(${hue}, 70%, 50%)`;
        }

        const user_color = valueToColor(config.presence);
        event.elements.event_presence.style.backgroundColor = numberToColorHSL(config.owner);
        event.style.backgroundColor = user_color;
        event.style.top = `${vmin * 100}%`;
        event.style.bottom = `${(1 - vmax) * 100}%`;
        event.style.left = `${hmin * 100}%`;
        event.style.right = `${(1 - hmax) * 100}%`;


        this._calendar_object.elements.rows.append(event)
    }

    /**
     * @param in_planning {Planning}
     */
    set_planning(in_planning) {
        this._planning = in_planning;
        this._refresh_calendar();

        this.events = [];
        if (this._planning) {
            fetch_api('slot/from-planning/', 'POST', this._planning.id.toString()).catch(error => {
                NOTIFICATION.error(new Message(error).title("Impossible d'obtenir les slots"));
            }).then((res) => {
                for (const event of res)
                    this.add_event(event);
            });
        }
    }

    /**
     * @returns {Planning}
     */
    planning() {
        return this._planning;
    }

    open_modal(content) {
        this.close_modal();
        this._modal_container.append(content);
    }

    close_modal() {
        for (const child of this._modal_container.children)
            child.remove();
    }

    async spawn_add_event() {
        if (GLOBAL_EVENT_CREATOR)
            GLOBAL_EVENT_CREATOR.remove();
        GLOBAL_EVENT_CREATOR = null;

        if (!this._planning)
            return;

        let left = this.mouse_x;
        let top = this.mouse_y;

        // Retrieve or create user from account
        if (!this._anonymous_user && APP_CONFIG.connected_user()) {
            let error = false;
            const res = await fetch_api('planning/find_or_create_user/', 'POST', {planning: this._planning.id.toString()}).catch(error => {
                NOTIFICATION.error(new Message(error).title("Impossible d'obtenir l'utilisateur"));
                error = true;
            });
            if (error)
                return;
            this._anonymous_user = PlanningUser.new(res);
        }
        if (this._planning.require_account && !APP_CONFIG.connected_user())
            await Authentication.login();
        else if (!this._anonymous_user && !APP_CONFIG.connected_user()) {
            await new Promise((success, failure) => {
                const form = require('./add_user.hbs')({}, {
                    show_user_list_options: () => {
                        form.elements.who_are_you_input.focus();
                        form.elements.who_are_you_input.value = '';
                    },
                    value_changed: () => {
                        const value = form.elements.who_are_you_input.value;
                        if (!value || value === "") {
                            form.elements.who_I_am.style.display = 'none';
                        } else {
                            form.elements.who_I_am.style.display = 'flex';
                            if (this._planning.users.has(value)) {
                                form.elements.who_I_am.value = `Je suis '${value}'`;
                            } else {
                                form.elements.who_I_am.value = `Ajouter l'utilisateur '${value}'`;
                            }
                        }
                    },
                    login: async () => {
                        await Authentication.login();
                        this.close_modal();
                        success();
                    },
                    submit: async (event) => {
                        event.preventDefault();
                        const value = form.elements.who_are_you_input.value;
                        if (this._planning.users.has(value)) {
                            this._anonymous_user = this._planning.users.get(value);
                            this.close_modal();
                            success();
                            return;
                        }
                        let error = false;
                        await fetch_api('planning/add_user/', 'POST', {
                            name: EncString.from_client(value),
                            planning: this._planning.id.toString(),
                        }).catch(error => {
                            NOTIFICATION.error(new Message(error).title("Impossible de créer l'utilisateur"));
                            error = true;
                            failure();
                        });
                        this.close_modal();
                        if (!error)
                            success();
                    },
                    close: () => {
                        this.close_modal();
                        failure();
                    }
                });

                for (const user of this._planning.users.values()) {
                    const option = document.createElement('option');
                    option.value = user.name.plain();
                    form.elements.who_are_you_list.append(option);
                }

                this.open_modal(form);
            })
        }

        GLOBAL_EVENT_CREATOR = require('./create_event.hbs')({when: this.selection[0].cell_time_start}, {
            close: () => {
                GLOBAL_EVENT_CREATOR.remove();
                GLOBAL_EVENT_CREATOR = null;
            },
            submit: async (event) => {
                event.preventDefault();

                const body = [];
                for (const item of this.selection) {
                    body.push({
                        planning: this._planning.id.toString(),
                        title: EncString.from_client(GLOBAL_EVENT_CREATOR.elements.name.value),
                        owner: this._anonymous_user.id.toString(),
                        start: this.selection[0].cell_time_start.getTime(),
                        end: this.selection[0].cell_time_end.getTime(),
                        source: EncString.from_client("Manual placement"),
                        presence: Number(GLOBAL_EVENT_CREATOR.elements.availability.value)
                    });
                }
                let errors = false;
                const res = await fetch_api('slot/create/', 'POST', body).catch(error => {
                    errors = true;
                    NOTIFICATION.error(new Message(error).title("Impossible de créer l'évenement"));
                });
                if (!errors)
                    for (const event of res)
                        this.add_event(event);


                GLOBAL_EVENT_CREATOR.remove();
                GLOBAL_EVENT_CREATOR = null;

                this.selection = [];
            }
        })
        this.append(GLOBAL_EVENT_CREATOR);

        const popupWidth = GLOBAL_EVENT_CREATOR.offsetWidth;
        const popupHeight = GLOBAL_EVENT_CREATOR.offsetHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

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