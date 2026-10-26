// Interactive tutorial driven by flags the game screen raises ('built',
// 'built:flak', 'waveStarted', 'waveEnded:N', 'upgraded', 'targeting',
// 'preview:<type>'). A step shows once its `when` flag is set and completes
// on its `until` flag ('ack' = the player pressed OK).

export class Tutorial {
  constructor(steps = []) {
    this.steps = steps;
    this.flags = new Set();
    this.done = new Set();
  }
  signal(flag) {
    this.flags.add(flag);
  }
  current() {
    for (const s of this.steps) {
      if (this.done.has(s.id)) continue;
      if (s.when && !this.flags.has(s.when)) continue;
      if (s.until !== 'ack' && this.flags.has(s.until) && this.shownOnce?.has(s.id)) {
        this.done.add(s.id);
        continue;
      }
      return s;
    }
    return null;
  }
  // Called every frame; returns the active step (marks it as seen).
  update() {
    const s = this.current();
    if (s) {
      this.shownOnce = this.shownOnce || new Set();
      if (!this.shownOnce.has(s.id)) {
        this.shownOnce.add(s.id);
        // flags raised before the step appeared do not count, except for
        // steps the player already did (built, upgraded)
        if (s.until !== 'ack' && !s.until.startsWith('built') && s.until !== 'upgraded') this.flags.delete(s.until);
      }
    }
    return this.current();
  }
  ack() {
    const s = this.current();
    if (s) this.done.add(s.id);
  }
  get finished() {
    return this.steps.every((s) => this.done.has(s.id));
  }
}
