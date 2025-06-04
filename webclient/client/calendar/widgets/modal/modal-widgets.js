
require('./modal-widgets.scss')
require('../checkslider/checkslider')

class CalendarModalContainer extends HTMLElement {
    constructor() {
        super();

        this.addEventListener('click', (element) => {
            if (element.target === this)
                this.close();
        })
    }

    connectedCallback() {
        this.modal_box = document.createElement('div');
        this.modal_box.classList.add('calendar-modal-box');
        this.append(this.modal_box)
    }

    /**
     * @typedef {Object} CreateInfos
     * @property {string|undefined} custom_width
     * @property {string|undefined} custom_height
     * @property {string|undefined} modal_class
     * @property {function} on_close
     */

    /**
     * @param widget {HTMLElement}
     * @param create_infos {CreateInfos|undefined}
     * @return {HTMLElement}
     */
    async open(widget, create_infos = undefined) {
        this.close();
        this._create_infos = create_infos;
        widget.append(document.createElement('calendar-modal-close'));
        this.modal_box.append(widget);
        this.classList.add('calendar-modal-open');
    }

    close() {
        if (this._create_infos && this._create_infos.on_close)
            this._create_infos.on_close();
        this._create_infos = null;
        this.modal_box.innerHTML = '';
        this.classList.remove('calendar-modal-open');
    }
}
customElements.define("calendar-modal-container", CalendarModalContainer, {});

class CalendarModalClose extends HTMLElement {
    constructor() {
        super();
        this.onclick = () => {
            /**
             * @type {CalendarModalContainer}
             */
            const owning_modal = this.closest('calendar-modal-container');
            console.assert(owning_modal, "'calendar-modal-close' doesn't belong to a valid 'calendar-modal-container'");
            owning_modal.close();
        }
    }
}
customElements.define("calendar-modal-close", CalendarModalClose);

