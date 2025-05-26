import {fetch_api} from "../utilities/request";
import {EncString} from "../utilities/encstring";
import {Message, NOTIFICATION} from "../views/message_box/notification";
import {APP_CONFIG} from "../utilities/app_config";
import {Authentication} from "../utilities/authentication/authentication";
import {CalendarUser} from "../utilities/calendar_user";
import {get_week_number} from "../utilities/time_utils";
import {EventPool} from "./event_pool";
import './body/calendar_body'
import {import_ics} from "../utilities/import/ics";
import {EventManager} from "../utilities/event_manager";

require('./calendar_app.scss');

class CalendarApp extends HTMLElement {
    constructor() {
        super();
        /**
         * Start of the display
         * @type {Date}
         * @private
         */
        this._display_date = new Date(Date.now());
        if (this.hasAttribute('display-date'))
            this._display_date = new Date(this.getAttribute('display-date'));
        /**
         * @type {String}
         * @private
         */
        this._title = "";
        if (this.hasAttribute('title'))
            this._title = new Date(this.getAttribute('title'));
        /**
         * The event pool that contains every displayed events
         * @type {EventPool}
         * @private
         */
        this._event_source = null;

        /**
         * @type {EventManager}
         */
        this.events = new EventManager();

        /**
         * @type {CalendarBody}
         * @private
         */
        this._main_body = null;

        /*
        this._scroll_offset = 0;
        this._touch_start = 0;
        document.addEventListener('touchstart', (event) => {
            this._touch_start = event.targetTouches[0].clientX;
        })
        document.addEventListener('touchend', (_) => {
            this._elements.body.style.transform = 'translate(0)';
        })
        document.addEventListener('touchmove', (event) => {
            this._elements.body.style.transform = `translate(${event.targetTouches[0].clientX - this._touch_start}px)`;
        })
        document.addEventListener("wheel", (event) => {
            this._scroll_offset += event.deltaX;
            this.display_start.setDate(this.display_start.getDate() + Math.sign(this._scroll_offset) * 7);
            this._elements.body.style.transform = `translate(${-this._scroll_offset}px)`;
        })*/
    }

    connectedCallback() {
        const elements = require('./calendar_app.hbs')({
            title: this._make_title()
        }, {
            'import': () => {
                const file_input = document.createElement('input');
                file_input.type = 'file';
                file_input.onchange = async (event) => {
                    await this._event_source.create_events(await import_ics(event.target['files'][0]));
                };
                file_input.click();
            },
            'next_week': () => {
                const date = new Date(this._display_date);
                date.setDate(this._display_date.getDate() + 7);
                this.set_display_date(date);
            },
            'today': () => {
                this.set_display_date(new Date(Date.now()));
            },
            'previous_week': () => {
                const date = new Date(this._display_date);
                date.setDate(this._display_date.getDate() - 7);
                this.set_display_date(date);
            }
        });
        this._elements = elements.elements;
        for (const element of elements)
            this.append(element);

        /** CREAT BODY **/
        this._main_body = document.createElement('calendar-body');
        this._main_body.set_display_date(this._display_date);
        this._main_body.set_event_source(this._event_source);
        this._elements.body.append(this._main_body)
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

    set_display_date(in_date) {
        if (in_date.getTime() === this._display_date.getTime())
            return;
        this._display_date = in_date;
        if (!this.isConnected)
            return;

        this._elements.title.innerText = this._make_title();

        if (this._main_body)
            this._main_body.set_display_date(this._display_date);
    }

    /**
     * @param event_pool {EventPool}
     */
    set_event_source(event_pool) {
        this._event_source = event_pool;
        if (this._main_body)
            this._main_body.set_event_source(this._event_source);
    }

    _make_title() {
        return `${this._display_date.toLocaleDateString(undefined, {month: 'long'})} ${this._display_date.getFullYear()} - Semaine ${get_week_number(this._display_date)}`
    }

    open_modal(content) {
        this.close_modal();
        this._elements['modal_container'].append(content);
    }

    close_modal() {
        for (const child of this._elements['modal_container'].children)
            child.remove();
    }
}

customElements.define("calendar-app", CalendarApp);
export {CalendarApp}