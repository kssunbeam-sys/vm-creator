// In-game clock. One day = 24 game hours; default 16 real minutes per day.
import { G } from './game.js';

export class GameTime {
  constructor() {
    this.day = 1;
    this.minutes = 7 * 60;
    this.rate = 1.5;   // game minutes per real second
    this.frozen = false;
  }
  get hour() { return this.minutes / 60; }
  get total() { return (this.day - 1) * 1440 + this.minutes; }
  update(dt) {
    if (this.frozen) return;
    this.minutes += dt * this.rate;
    while (this.minutes >= 1440) {
      this.minutes -= 1440;
      this.day++;
      G.events.emit('newDay', this.day);
    }
  }
  advance(mins) {
    this.minutes += mins;
    while (this.minutes >= 1440) { this.minutes -= 1440; this.day++; G.events.emit('newDay', this.day); }
  }
  // Sleep: jump to 6:00 of the next morning (or today if before 4:00)
  sleep() {
    if (this.minutes < 4 * 60) { this.minutes = 6 * 60; G.events.emit('slept', this.day); return; }
    this.minutes = 6 * 60;
    this.day++;
    G.events.emit('newDay', this.day);
    G.events.emit('slept', this.day);
  }
  label() {
    const h = Math.floor(this.hour), m = Math.floor(this.minutes % 60 / 10) * 10;
    const ampm = h < 12 ? 'AM' : 'PM';
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  isNight() { const h = this.hour; return h >= 20 || h < 5.5; }
}
