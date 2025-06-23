require('./modal-widgets.scss')
require('../checkslider/checkslider')

class CalendarModalContainer extends HTMLElement {
    constructor() {
        super();

        this.addEventListener('click', (element) => {
            if (element.target === this) {
                this.close();
            }
        })
    }

    connectedCallback() {
        this.modal_box = document.createElement('div');
        this.modal_box.classList.add('calendar-modal-box');
        this.append(this.modal_box)
    }

    /**
     * @typedef {Object} CreateInfos
     * @property {string|undefined} modal_class
     * @property {MouseEvent|undefined} relative_event
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
        const container_bounds = this.getBoundingClientRect();
        this.classList.add('calendar-modal-open');
        if (create_infos.relative_event) {
            this.classList.add('calendar-modal-relative');
            const bounds = widget.getBoundingClientRect();
            this.modal_box.style.left = `${Math.min(create_infos.relative_event.clientX, container_bounds.width - bounds.width - 50)}px`;
            this.modal_box.style.top = `${Math.min(create_infos.relative_event.clientY, container_bounds.height - bounds.height - 90)}px`;
        } else {
            this.modal_box.style.left = 'auto'
            this.modal_box.style.top = 'auto'
            this.classList.remove('calendar-modal-relative');
        }
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

