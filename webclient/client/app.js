import './utilities/handlebars_helpers';
import './views/user_header/user_header'
import {GLOBAL_EVENTS} from "./utilities/event_manager";
import {APP_CONFIG} from "./utilities/app_config";
import './views/calendar_list/calendar_list';

require('./app.scss');
require('./calendar/calendar_app');



let CURRENT_WIDGET = null;

function refresh_content(connected_user) {
    if (CURRENT_WIDGET)
        CURRENT_WIDGET.remove();
    CURRENT_WIDGET = null;

    CURRENT_WIDGET = document.createElement('calendar-list');

    if (connected_user) {

    } else {

    }
    const container = document.getElementById('page-content');
    container.append(CURRENT_WIDGET);
}

refresh_content(APP_CONFIG.connected_user());

GLOBAL_EVENTS.add('on_connected_user_changed', (payload) => {
    refresh_content(payload.new);
});

