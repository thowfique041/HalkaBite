import React from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';

const parts = (value: string) => ({ date: value.slice(0, 10), time: value.slice(11, 16) });
const combine = (date: string, time: string) => `${date}T${time}`;
const displayDate = (value: string) => {
  if (!value) return 'DD/MM/YYYY';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const localDateTimeDefaults = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const local = (date: Date) => {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
  };
  return { startAt: local(now), endAt: local(end) };
};

interface Props {
  startAt: string;
  endAt: string;
  onChange: (values: { startAt: string; endAt: string }) => void;
}

const CampaignDateTimePicker: React.FC<Props> = ({ startAt, endAt, onChange }) => {
  const start = parts(startAt); const end = parts(endAt);
  const valid = Boolean(startAt && endAt && new Date(endAt).getTime() > new Date(startAt).getTime());
  const updateStart = (date: string, time: string) => {
    const nextStart = combine(date, time);
    const currentEnd = new Date(endAt);
    const nextStartDate = new Date(nextStart);
    const nextEnd = !endAt || currentEnd <= nextStartDate
      ? new Date(nextStartDate.getTime() + 60 * 60 * 1000) : currentEnd;
    const shifted = new Date(nextEnd.getTime() - nextEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    onChange({ startAt: nextStart, endAt: shifted });
  };
  const field = (label: string, type: 'date' | 'time', value: string, min: string | undefined, change: (value: string) => void) => {
    const Icon = type === 'date' ? CalendarDays : Clock3;
    return <label className="block">
      <span className="text-sm text-white/65">{label}</span>
      <div className="relative mt-2 group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 pointer-events-none z-10" />
        <input type={type} value={value} min={min} onChange={event => change(event.target.value)} required
          className="input pl-12 [color-scheme:dark] bg-white/[0.055] backdrop-blur-xl hover:bg-white/[0.075] focus:shadow-lg focus:shadow-primary-500/10" />
      </div>
      <span className="block text-xs text-white/35 mt-1.5">{type === 'date' ? displayDate(value) : `${value || 'HH:mm'} · 24-hour time`}</span>
    </label>;
  };
  return <div className="md:col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-primary-500/[0.035] p-4 md:p-5">
    <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-primary-400" /><h3 className="font-semibold">Campaign Schedule</h3><span className="ml-auto text-xs text-white/35">Local time</span></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {field('Start Date', 'date', start.date, undefined, value => updateStart(value, start.time))}
      {field('Start Time', 'time', start.time, undefined, value => updateStart(start.date, value))}
      {field('End Date', 'date', end.date, start.date, value => onChange({ startAt, endAt: combine(value, end.time) }))}
      {field('End Time', 'time', end.time, end.date === start.date ? start.time : undefined, value => onChange({ startAt, endAt: combine(end.date, value) }))}
    </div>
    {!valid && <p role="alert" className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">End date and time must be later than the start date and time.</p>}
    {valid && <p className="mt-4 text-xs text-green-400">Schedule is valid · {displayDate(start.date)} {start.time} → {displayDate(end.date)} {end.time}</p>}
  </div>;
};
export default CampaignDateTimePicker;
