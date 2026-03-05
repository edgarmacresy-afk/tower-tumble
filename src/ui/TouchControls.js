import { CAMERA } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';

export class TouchControls {
  constructor(controller, cameraController) {
    this.controller = controller;
    this.cam = cameraController;
    this.active = false;

    // Joystick state
    this.stickTouchId = null;
    this.stickOrigin = { x: 0, y: 0 };
    this.stickPos = { x: 0, y: 0 };
    this.stickRadius = 55;

    // Jump state
    this.jumpTouchId = null;

    // Camera drag state
    this.camTouchId = null;
    this.camLastPos = { x: 0, y: 0 };

    // Elements
    this.container = null;
    this.joystickArea = null;
    this.joystickBase = null;
    this.joystickKnob = null;
    this.jumpBtn = null;

    this._boundHandlers = {};
  }

  init() {
    if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) return;
    this.active = true;
    this._createUI();
    this._bindEvents();
  }

  _createUI() {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.innerHTML = `
      <div id="touch-joystick-area">
        <div id="touch-joystick-base">
          <div id="touch-joystick-knob"></div>
        </div>
      </div>
      <button id="touch-jump-btn">JUMP</button>
    `;
    document.body.appendChild(this.container);

    this.joystickArea = document.getElementById('touch-joystick-area');
    this.joystickBase = document.getElementById('touch-joystick-base');
    this.joystickKnob = document.getElementById('touch-joystick-knob');
    this.jumpBtn = document.getElementById('touch-jump-btn');
  }

  _bindEvents() {
    // Prevent default on touch controls to avoid scrolling
    const prevent = (e) => e.preventDefault();
    this.container.addEventListener('touchstart', prevent, { passive: false });
    this.container.addEventListener('touchmove', prevent, { passive: false });

    // Joystick
    this.joystickArea.addEventListener('touchstart', (e) => this._joystickStart(e));
    this.joystickArea.addEventListener('touchmove', (e) => this._joystickMove(e));
    this.joystickArea.addEventListener('touchend', (e) => this._joystickEnd(e));
    this.joystickArea.addEventListener('touchcancel', (e) => this._joystickEnd(e));

    // Jump button — track touch ID to prevent losing the press
    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.jumpTouchId = e.changedTouches[0].identifier;
      this.controller.keys['Space'] = true;
    });
    this.jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      for (const t of e.changedTouches) {
        if (t.identifier === this.jumpTouchId) {
          this.jumpTouchId = null;
          this.controller.keys['Space'] = false;
          break;
        }
      }
    });
    this.jumpBtn.addEventListener('touchcancel', (e) => {
      e.stopPropagation();
      this.jumpTouchId = null;
      this.controller.keys['Space'] = false;
    });

    // Camera drag — on the canvas/document (touches not on joystick or jump)
    this._boundHandlers.touchstart = (e) => this._camStart(e);
    this._boundHandlers.touchmove = (e) => this._camMove(e);
    this._boundHandlers.touchend = (e) => this._camEnd(e);
    this._boundHandlers.touchcancel = (e) => this._camEnd(e);

    document.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
    document.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    document.addEventListener('touchend', this._boundHandlers.touchend);
    document.addEventListener('touchcancel', this._boundHandlers.touchcancel);
  }

  _joystickStart(e) {
    if (this.stickTouchId !== null) return;
    const t = e.changedTouches[0];
    this.stickTouchId = t.identifier;
    const rect = this.joystickBase.getBoundingClientRect();
    this.stickOrigin.x = rect.left + rect.width / 2;
    this.stickOrigin.y = rect.top + rect.height / 2;
    this._updateJoystick(t.clientX, t.clientY);
  }

  _joystickMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.stickTouchId) {
        this._updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  }

  _joystickEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.stickTouchId) {
        this.stickTouchId = null;
        this.stickPos.x = 0;
        this.stickPos.y = 0;
        this.joystickKnob.style.transform = 'translate(-50%, -50%)';
        this._applyMovement();
        break;
      }
    }
  }

  _updateJoystick(cx, cy) {
    let dx = cx - this.stickOrigin.x;
    let dy = cy - this.stickOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.stickRadius) {
      dx = (dx / dist) * this.stickRadius;
      dy = (dy / dist) * this.stickRadius;
    }
    this.stickPos.x = dx / this.stickRadius; // -1 to 1
    this.stickPos.y = dy / this.stickRadius; // -1 to 1

    this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this._applyMovement();
  }

  _applyMovement() {
    const deadzone = 0.15;
    const keys = this.controller.keys;

    const ax = Math.abs(this.stickPos.x);
    const ay = Math.abs(this.stickPos.y);

    keys['KeyA'] = this.stickPos.x < -deadzone;
    keys['KeyD'] = this.stickPos.x > deadzone;
    keys['KeyW'] = this.stickPos.y < -deadzone;
    keys['KeyS'] = this.stickPos.y > deadzone;
  }

  _isTouchOnUI(t) {
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el) return false;
    return this.container.contains(el) ||
      el.closest('.screen-overlay') ||
      el.closest('#survival-hud') ||
      el.closest('#stumble-hud') ||
      el.closest('#hud');
  }

  _camStart(e) {
    if (this.camTouchId !== null) return;
    for (const t of e.changedTouches) {
      if (!this._isTouchOnUI(t)) {
        this.camTouchId = t.identifier;
        this.camLastPos.x = t.clientX;
        this.camLastPos.y = t.clientY;
        e.preventDefault();
        break;
      }
    }
  }

  _camMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.camTouchId) {
        const dx = t.clientX - this.camLastPos.x;
        const dy = t.clientY - this.camLastPos.y;
        this.camLastPos.x = t.clientX;
        this.camLastPos.y = t.clientY;

        const sensitivity = CAMERA.MOUSE_SENSITIVITY * 1.5;
        this.cam.yaw -= dx * sensitivity;
        this.cam.pitch -= dy * sensitivity;
        this.cam.pitch = clamp(this.cam.pitch, CAMERA.MIN_PITCH, CAMERA.MAX_PITCH);
        e.preventDefault();
        break;
      }
    }
  }

  _camEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.camTouchId) {
        this.camTouchId = null;
        break;
      }
    }
  }

  destroy() {
    if (!this.active) return;
    document.removeEventListener('touchstart', this._boundHandlers.touchstart);
    document.removeEventListener('touchmove', this._boundHandlers.touchmove);
    document.removeEventListener('touchend', this._boundHandlers.touchend);
    document.removeEventListener('touchcancel', this._boundHandlers.touchcancel);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.active = false;
  }
}
