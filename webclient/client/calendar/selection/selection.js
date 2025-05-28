require('./selection.scss')

class CalendarSelection extends HTMLElement {
    constructor() {
        super();

        this.has_drag_start = true;
        this.has_drag_end = true;

        this._drag_end = false;
        this._drag_start = false;

        /**
         * @type {CalendarBody}
         * @private
         */
        this._owning_body = null;

        /**
         * @type {number|null}
         */
        this.selection_id = null;
    }

    connectedCallback() {
        this._owning_body = this.closest("calendar-body");
        console.assert(this._owning_body, "This selection doesn't belong inside a 'calendar-body' element");
        this._owning_body.addEventListener('pointermove', async (event) => {
            if (this._drag_start || this._drag_end)
                await this._update_selection(event)
        })
        this._owning_body.addEventListener('pointerup', async (event) => {
            this._drag_start = false;
            this._drag_end = false;
        })

        const elements = require('./selection.hbs')(this, {
            down_start: () => {
                this._drag_start = true
            },
            down_end: () => {
                this._drag_end = true
            }
        });
        for (const element of elements)
            this.append(element);
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
        }
    }
}

customElements.define("calendar-selection", CalendarSelection);