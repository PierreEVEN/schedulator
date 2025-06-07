import './utilities/handlebars_helpers';
import './views/user_header/user_header'
import {GLOBAL_EVENTS} from "./utilities/event_manager";
import {APP_CONFIG} from "./utilities/app_config";
import './views/calendar_list/calendar_list';
import {EventPool} from "./calendar/event_pool";
import {fetch_api} from "./utilities/request";
import {Message, NOTIFICATION} from "./views/message_box/notification";
import {Event} from "./utilities/event";
import {EncString} from "./utilities/encstring";

require('./app.scss');
require('./calendar/calendar_app');

/**
 * @type {CalendarApp}
 */
let CURRENT_WIDGET = null;

function try_update_display_user(connected_user) {
    if (CURRENT_WIDGET)
        CURRENT_WIDGET.remove();
    CURRENT_WIDGET = null;

    if (connected_user) {
        CURRENT_WIDGET = document.createElement('calendar-list');
    } else {
    }
    if (CURRENT_WIDGET) {
        const container = document.getElementById('page-content');
        container.append(CURRENT_WIDGET);
    }
}

/**
 * @param calendar {Calendar}
 */
function try_update_display_calendar(calendar) {
    if (calendar) {

        if (CURRENT_WIDGET)
            CURRENT_WIDGET.remove();


        fetch_api('event/from-calendar', 'POST', calendar.id.toString()).catch(error => {
            NOTIFICATION.error(new Message(error).title("Impossible d'obtenir les événements"));
            throw new Error(error);
        }).then(res => {
            const events = new EventPool();

            events.events.add('create-batch', async (events) => {
                const event_data = [];
                const create_res = await fetch_api('event/create', 'POST', event_data).catch(error => {
                    NOTIFICATION.error(new Message(error).title("Impossible de créer les événements sur le serveur"));
                    throw new Error(error);
                });
                for (const event of create_res)
                    events.register_event(event);
            })

            for (const event of res)
                events.register_event(Event.new(event));

            const container = document.getElementById('page-content');
            /**
             * @type {CalendarApp}
             */
            CURRENT_WIDGET = document.createElement('calendar-app');
            CURRENT_WIDGET.set_event_source(events);
            CURRENT_WIDGET.set_range(calendar.start_daily_hour, calendar.end_daily_hour, calendar.time_precision);
            container.append(CURRENT_WIDGET);
        });
    } else {
        try_update_display_user(APP_CONFIG.connected_user());
    }
}

GLOBAL_EVENTS.add('on_connected_user_changed', (payload) => {
    if (!APP_CONFIG.display_calendar())
        try_update_display_user(payload.new);
});

GLOBAL_EVENTS.add('on_display_calendar_changed', (payload) => {
    try_update_display_calendar(payload.new);
});

try_update_display_calendar(APP_CONFIG.display_calendar());

document.getElementById('global-title').onclick = (event) => {
    event.preventDefault();
    APP_CONFIG.set_display_calendar(null);
}