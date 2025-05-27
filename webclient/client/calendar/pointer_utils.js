import {EventManager} from "../utilities/event_manager";

class PointerUtils {
    constructor() {

        this.events = new EventManager();

        document.addEventListener('pointerdown', async (event) => {
            /**
             * @type {number}
             */
            this.mouseX = event.clientX;
            /**
             * @type {number}
             */
            this.mouseY = event.clientY;

            await this.events.broadcast('move', {x: this.mouseX, y: this.mouseY});
        })

        document.addEventListener('pointerup', async (event) => {
            /**
             * @type {number}
             */
            this.mouseX = event.clientX;
            /**
             * @type {number}
             */
            this.mouseY = event.clientY;

            await this.events.broadcast('move', {x: this.mouseX, y: this.mouseY});
        })

        document.addEventListener('pointermove', async (event) => {
            /**
             * @type {number}
             */
            this.mouseX = event.clientX;
            /**
             * @type {number}
             */
            this.mouseY = event.clientY;

            await this.events.broadcast('move', {x: this.mouseX, y: this.mouseY});
        })
    }
}

/**
 * @type {PointerUtils}
 */
const POINTER_UTILS = new PointerUtils();

export {POINTER_UTILS}