// Child-process probe: prints every result of the module as JSON. Run with different TZ env values;
// the output must be byte-identical for the explicit-zone paths.
import {TASK, ZONES, flawedDeadline, correctedDeadline, scheduledEvent, renderTaskHtml} from './dates.mjs';
const out = {
  flawed: ZONES.map((z) => flawedDeadline(TASK.deadline, z)),
  corrected: ZONES.map((z) => correctedDeadline(TASK.deadline, z)),
  event: ZONES.map((z) => scheduledEvent(TASK.eventAt, z)),
  htmlFlawed: renderTaskHtml(TASK, ZONES, 'flawed'),
  htmlCorrected: renderTaskHtml(TASK, ZONES, 'corrected'),
  // controls: these are NOT zone-independent, which is the point
  localParse: {
    dateOnly: new Date('2026-01-15').toISOString(),
    dateTimeNoOffset: new Date('2026-01-15T00:00:00').toISOString(),
    slashForm: new Date('01/15/2026').toISOString(),
  },
};
console.log(JSON.stringify(out));
