import {fetch_api} from "../utilities/request";
import {EncString} from "../utilities/encstring";
import {Message, NOTIFICATION} from "../views/message_box/notification";
import {APP_CONFIG} from "../utilities/app_config";
import {Authentication} from "../utilities/authentication/authentication";
import {CalendarUser} from "../utilities/calendar_user";
import ICAL from "ical.js";
import {Event} from "../utilities/event";
import {get_week_number, ONE_DAY_MS} from "../utilities/time_utils";
import {EventPool} from "./event_pool";
import './body/calendar_body'

require('./calendar_app.scss');

let GLOBAL_EVENT_CREATOR = null;


class CalendarApp extends HTMLElement {
    constructor() {
        super();
        /**
         * Start date
         * @type {Date}
         */
        this.end = new Date(Date.now());
        /**
         * End date
         * @type {Date}
         */
        this.start = new Date(new Date().setMonth(new Date(this.end).getMonth() - 3));
        /**
         * Start of the display
         * @type {Date}
         */
        this.display_start = new Date(new Date().setMonth(new Date(this.end).getMonth() - 1));

        this.display_days = 7;
        const days = this.display_start.getDay();
        this.display_start.setDate(this.display_start.getDate() - (days === 0 ? 6 : days - 1));

        this.addEventListener('mousemove', (event) => {
            this.mouse_x = event.clientX;
            this.mouse_y = event.clientY;
        });

        if (this.hasAttribute('start'))
            this.start = new Date(this.getAttribute('start'));
        if (this.hasAttribute('end'))
            this.end = new Date(this.getAttribute('end'));

        /**
         * @type {EventPool}
         */
        this.event_pool = new EventPool();

        this.selection = [];

        /**
         * @type {CalendarUser | null}
         */
        this._current_calendar_user = null;

        /**
         * @type {Calendar | null}
         */
        this._calendar = null;


        this._scroll_offset = 0;
        this._touch_start = 0;

        document.addEventListener('touchstart', (event) => {
            this._touch_start = event.targetTouches[0].clientX;
        })
        document.addEventListener('touchend', (event) => {
            this._elements.elements.body.style.transform = 'translate(0)';
        })

        document.addEventListener('touchmove', (event) => {
            this._elements.elements.body.style.transform = `translate(${event.targetTouches[0].clientX - this._touch_start}px)`;
        })

        document.addEventListener("wheel", (event) => {
            this._scroll_offset += event.deltaX;
            this.display_start.setDate(this.display_start.getDate() + Math.sign(this._scroll_offset) * 7);
            this._elements.elements.body.style.transform = `translate(${-this._scroll_offset}px)`;
        })
    }

    _refresh_calendar() {
        if (this._main_body)
            this._main_body.remove();
        const body = document.createElement('calendar-body');
        body.parent = this;
        body.display_start = this.display_start;
        body.set_event_source(this.event_pool);
        this._main_body = body;
        this._elements.elements.body.append(body)
    }

    connectedCallback() {
        this._elements = require('./calendar_app.hbs')({
            title: this._calendar.title.plain(),
            week_number: get_week_number(this.display_start),
            year: this.display_start.getFullYear(),
            month: this.display_start.toLocaleDateString(undefined, {month: 'long'})
        }, {
            'import': () => {
                this._elements.elements['file_input'].click();
            },
            'set_input_ics': async (event) => {
                const user = await this.get_connected_user();

                const raw_data = await new Promise((resolve, reject) => {
                    const file = event.target.files[0];
                    if (!file) {
                        return reject("File not found")
                    }
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const fileContent = e.target.result;
                        resolve({data: fileContent, filename: file.name});
                    };
                    reader.onerror = function (e) {
                        reject("Error reading ics file : " + e);
                    };
                    reader.readAsText(file);
                });
                const res = ICAL.parse(raw_data.data);

                const body = [];

                for (const event of res[2]) {
                    const kind = event[0];
                    if (kind === 'vevent') {
                        /**
                         * @type {Date}
                         */
                        let start = null;
                        let end = null;
                        let title = null;
                        let recur = null;
                        let exdates = new Set();
                        for (const prop of event[1]) {
                            if (prop[0] === 'dtstart' && (prop[2] === "date-time" || prop[2] === 'date'))
                                start = new Date(prop[3])
                            else if (prop[0] === 'dtend' && prop[2] === "date-time" || prop[2] === 'date')
                                end = new Date(prop[3])
                            else if (prop[0] === 'summary' && prop[2] === "text")
                                title = EncString.from_client(prop[3])
                            else if (prop[0] === 'rrule') {
                                if (prop[2] === 'recur') {
                                    recur = prop[3];
                                } else
                                    console.warn('Unhandled rrule type : ', event);
                            } else if (prop[0] === 'exdate') {
                                if (prop[2] === 'date-time') {
                                    exdates.add(new Date(prop[3]).getTime());
                                } else
                                    console.warn('Unhandled exdate value type : ', event);
                            }
                        }

                        if (!start)
                            console.warn('Invalid start : ', event)
                        if (!end)
                            console.warn('Invalid end : ', event)
                        if (!title)
                            console.warn('Invalid title : ', event)
                        if (!start || !end || !title)
                            continue;

                        const reg_event = (date, duration) => {
                            body.push({
                                calendar: this._calendar.id.toString(),
                                title: title.encoded(),
                                owner: user.id.toString(),
                                start: date,
                                end: date + duration,
                                source: EncString.from_client(`import@${raw_data.filename}`).encoded(),
                                presence: -10
                            });
                        }

                        const duration = end.getTime() - start.getTime();
                        if (!recur) {
                            reg_event(start.getTime(), duration)
                        } else {
                            const interval = recur.interval || 1;
                            const until = recur.until ? new Date(recur.until) : this.end;
                            let count = recur.count || Number.MAX_SAFE_INTEGER;

                            if (recur.freq === 'WEEKLY') {
                                do {
                                    start.setDate(start.getDate() + 7 * interval);
                                    if (!exdates.has(start.getTime()))
                                        reg_event(start.getTime(), duration);
                                } while (start < until && --count > 0)
                            } else if (recur.freq === 'MONTHLY') {
                                do {
                                    start.setMonth(start.getMonth() + interval);
                                    if (!exdates.has(start.getTime()))
                                        reg_event(start.getTime(), duration);
                                } while (start < until && --count > 0)
                            } else if (recur.freq === 'YEARLY') {
                                do {
                                    start.setUTCFullYear(start.getUTCFullYear() + interval);
                                    if (!exdates.has(start.getTime()))
                                        reg_event(start.getTime(), duration);
                                } while (start < until && --count > 0)
                            } else if (recur.freq === 'DAILY') {
                                do {
                                    start.setUTCFullYear(start.getUTCFullYear() + interval);
                                    if (!exdates.has(start.getTime()))
                                        reg_event(start.getTime(), duration);
                                } while (start < until && --count > 0)
                            } else {
                                console.warn(`Unhandled recurrence frequency : ${recur}`);
                                if (!exdates.has(start.getTime()))
                                    reg_event(start.getTime(), duration);
                            }
                        }
                    }
                }
                const create_res = await fetch_api('event/create/', 'POST', body).catch(error => {
                    NOTIFICATION.error(new Message(error).title("Impossible de créer l'évenement"));
                    throw new Error(error);
                });
                for (const event of create_res) {
                    this.event_pool.register_event(Event.new(event))
                }
                this._refresh_calendar();
            },
            'next_week': () => {
                this.display_start.setDate(this.display_start.getDate() + this.display_days);
                this._refresh_calendar();
            },
            'today': () => {
                this.display_start = new Date(Date.now());
                const days = this.display_start.getDay();
                this.display_start.setDate(this.display_start.getDate() - (days === 0 ? 6 : days - 1));
                this._refresh_calendar();
            },
            'previous_week': () => {
                this.display_start.setDate(this.display_start.getDate() - this.display_days);
                this._refresh_calendar();
            }
        });

        for (const element of this._elements)
            this.append(element);
        this._refresh_calendar();
    }

    /**
     * @param try_connect {boolean}
     * @returns {CalendarUser | null}
     */
    async get_connected_user(try_connect = true) {
        if (!try_connect)
            return this._current_calendar_user;

        // Login if required
        if (this._calendar.require_account && !APP_CONFIG.connected_user())
            await Authentication.login();

        if (!APP_CONFIG.connected_user()) {
            // Try to create an unauthenticated user
            this._current_calendar_user = await new Promise((success, failure) => {
                const add_user_form = require('./add_user.hbs')({}, {
                    'show_user_list_options': () => {
                        add_user_form.elements.who_are_you_input.focus();
                        add_user_form.elements.who_are_you_input.value = '';
                    },
                    'value_changed': () => {
                        const value = add_user_form.elements.who_are_you_input.value;
                        if (!value || value === "") {
                            add_user_form.elements.who_I_am.style.display = 'none';
                        } else {
                            add_user_form.elements.who_I_am.style.display = 'flex';
                            if (this._calendar.users.has(value)) {
                                add_user_form.elements.who_I_am.value = `Je suis '${value}'`;
                            } else {
                                add_user_form.elements.who_I_am.value = `Ajouter l'utilisateur '${value}'`;
                            }
                        }
                    },
                    // Try to authenticate
                    'login': async () => {
                        await Authentication.login();
                        this.close_modal();
                        success(null);
                    },
                    'submit': async (event) => {
                        event.preventDefault();
                        const value = add_user_form.elements['who_are_you_input'].value;
                        // The user already exists
                        if (this._calendar.users.has(value)) {
                            this.close_modal();
                            success(this._calendar.users.get(value));
                        } else {
                            await fetch_api('calendar/add_user/', 'POST', {
                                name: EncString.from_client(value),
                                calendar: this._calendar.id.toString(),
                            }).then((res) => {
                                this.close_modal();
                                success(new CalendarUser(res));
                            }).catch(error => {
                                NOTIFICATION.error(new Message(error).title("Impossible de créer l'utilisateur"));
                            });
                        }
                    },
                    'close': () => {
                        this.close_modal();
                        failure();
                    }
                });

                for (const user of this._calendar.users.values()) {
                    const option = document.createElement('option');
                    option.value = user.name.plain();
                    add_user_form.elements.who_are_you_list.append(option);
                }

                this.open_modal(add_user_form);
            });
        }

        if (APP_CONFIG.connected_user()) {
            // We use an authenticated user
            if (this._current_calendar_user && this._current_calendar_user.user_id === APP_CONFIG.connected_user().id)
                return this._current_calendar_user;
            else {
                // Try creating a calendar user from authenticated user
                const res = await fetch_api('calendar/find_or_create_user/', 'POST', {calendar: this._calendar.id.toString()}).catch(error => {
                    NOTIFICATION.error(new Message(error).title("Impossible de créer un utilisateur authentifié"));
                    throw new Error(error);
                });
                this._current_calendar_user = CalendarUser.new(res);
            }
        }

        return this._current_calendar_user;
    }

    /**
     * @param in_calendar {Event}
     */
    set_calendar(in_calendar) {
        this._calendar = in_calendar;

        this.event_pool = new EventPool();
        if (this._calendar) {
            fetch_api('event/from-calendar/', 'POST', this._calendar.id.toString()).catch(error => {
                NOTIFICATION.error(new Message(error).title("Impossible d'obtenir les events"));
            }).then((res) => {
                for (const event of res)
                    this.event_pool.register_event(Event.new(event))
                this._refresh_calendar();
            });
        }
    }

    /**
     * @returns {Event}
     */
    calendar() {
        return this._calendar;
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

        if (!this._calendar)
            return;

        let left = this.mouse_x;
        let top = this.mouse_y;

        // Retrieve or create user from account
        const user = await this.get_connected_user();

        let sel_start = this.selection[0].cell_time_start;
        sel_start = sel_start.getFullYear() +
            '-' + String(sel_start.getMonth() + 1).padStart(2, '0') +
            '-' + String(sel_start.getDate()).padStart(2, '0') +
            'T' + String(sel_start.getHours()).padStart(2, '0') +
            ':' + String(sel_start.getMinutes()).padStart(2, '0');
        let sel_end = this.selection[0].cell_time_end;
        sel_end = sel_end.getFullYear() +
            '-' + String(sel_end.getMonth() + 1).padStart(2, '0') +
            '-' + String(sel_end.getDate()).padStart(2, '0') +
            'T' + String(sel_end.getHours()).padStart(2, '0') +
            ':' + String(sel_end.getMinutes()).padStart(2, '0');

        GLOBAL_EVENT_CREATOR = require('./create_event.hbs')({
            start: sel_start,
            end: sel_end
        }, {
            close: (event) => {
                event.preventDefault();
                GLOBAL_EVENT_CREATOR.remove();
                GLOBAL_EVENT_CREATOR = null;
            },
            submit: async (event) => {
                event.preventDefault();

                const body = [];
                for (const item of this.selection) {
                    body.push({
                        calendar: this._calendar.id.toString(),
                        title: EncString.from_client(GLOBAL_EVENT_CREATOR.elements.name.value),
                        owner: user.id.toString(),
                        start: new Date(GLOBAL_EVENT_CREATOR.elements.start.value).getTime(),
                        end: new Date(GLOBAL_EVENT_CREATOR.elements.end.value).getTime(),
                        source: EncString.from_client("Manual placement"),
                        presence: Number(GLOBAL_EVENT_CREATOR.elements.presence.value)
                    });
                }
                const res = await fetch_api('event/create/', 'POST', body).catch(error => {
                    NOTIFICATION.error(new Message(error).title("Impossible de créer l'évenement"));
                    throw new Error(error);
                });
                for (const event of res) {
                    this.event_pool.register_event(Event.new(event))
                }
                this._refresh_calendar();


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