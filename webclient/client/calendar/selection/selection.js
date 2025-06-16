require('./selection.scss')
const {time_format_from_ms, get_day_time} = require("../../utilities/time_utils");

class CalendarSelection extends HTMLElement {
    constructor() {
        super();

        this.has_drag_start = true;
        this.has_drag_end = true;

        this._drag_end = false;
        this._drag_start = false;
        this._drag_body = null;

        /**
         * @type {CalendarBody}
         * @private
         */
        this._owning_body = null;

        /**
         * @type {number|null}
         */
        this.selection_id = null;

        this.oncontextmenu = (event) => {
            event.preventDefault();

            /**
             * @type {CalendarApp}
             */
            const app = event.target.closest('calendar-app');
            if (app) {
                app.open_modal(document.createElement('calendar-create-event-modal'), {relative_event: event});
            }
        }

        this.onpointerdown = async (event) => {
            const cell = this._owning_body.get_cell_from_pointer(event.clientX, event.clientY);
            if (cell) {
                const selection = await this._owning_body.selector().get(this.selection_id);
                if (!selection)
                    return;
                this._drag_body = {
                    delta_start: selection.start.getTime() - cell['cell_time_start'].getTime(),
                    delta_end: selection.end.getTime() - cell['cell_time_start'].getTime(),
                };
            }
        }
    }

    connectedCallback() {
        this._owning_body = this.closest("calendar-body");
        console.assert(this._owning_body, "This selection doesn't belong inside a 'calendar-body' element");
        this._owning_body.addEventListener('pointermove', async (event) => {
            if (this._drag_start || this._drag_end || this._drag_body)
                await this._update_selection(event)
        })
        document.addEventListener('pointerup', async (event) => {
            this._drag_start = false;
            this._drag_end = false;
            this._drag_body = false;
        })

        const elements = require('./selection.hbs')(this, {
            down_start: () => {
                this._drag_start = true
            },
            down_end: () => {
                this._drag_end = true
            }
        });
        this._elements = elements[0].hb_elements;
        for (const element of elements)
            this.append(element);

        this._just_created = true;

        document.addEventListener('pointerdown', async (event) => {
            const selection = event.target.closest('calendar-selection');
            if (selection && selection.selection_id === this.selection_id)
                this.classList.add('calendar-selection-over')
            else if (!this._just_created)
                this.classList.remove('calendar-selection-over')
            this._just_created = false;
        })
    }

    /**
     * @param start {Date}
     * @param end {Date}
     * @param select {boolean}
     */
    update(start, end, select) {
        if (!this.isConnected)
            return;
        this._elements['time_start'].innerText = time_format_from_ms(get_day_time(start));
        this._elements['time_end'].innerText = time_format_from_ms(get_day_time(end));
        if (select)
            this.classList.add('calendar-selection-over');
    }

    async _update_selection(event) {
        const cell = this._owning_body.get_cell_from_pointer(event.clientX, event.clientY);
        if (!cell)
            return;

        if (this.selection_id === null)
            return console.error("'Selection.selection_id' is not set !");

        if (this._drag_start) {
            await this._owning_body.selector().update_selection_start(this.selection_id, cell['cell_time_start']);
        } else if (this._drag_end) {
            await this._owning_body.selector().update_selection_end(this.selection_id, cell['cell_time_end']);
        } else if (this._drag_body) {

            await this._owning_body.selector().update_selection(
                this.selection_id,
                new Date(cell['cell_time_start'].getTime() + this._drag_body.delta_start),
                new Date(cell['cell_time_start'].getTime() + this._drag_body.delta_end));
        }
    }
}

customElements.define("calendar-selection", CalendarSelection);