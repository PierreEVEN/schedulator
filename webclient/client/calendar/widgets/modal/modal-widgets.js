
require('./modal-widgets.scss')

class CalendarModalContainer extends HTMLElement {
    constructor() {
        super();

        this.addEventListener('click', (element) => {
            if (element.target === this)
                this.close();
        })
    }

    connectedCallback() {

    }

    open(widget) {
        this.close();
        this.append(widget);
        this.classList.add('calendar-modal-open');
    }

    close() {
        this.innerHTML = '';
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

