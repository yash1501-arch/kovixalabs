import { CalendarClient } from "./calendar-client";

export default function CalendarPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Publishing</p>
          <h1>Calendar</h1>
          <p className="lede">Schedule, approve, and track posts across all connected channels.</p>
        </div>
      </div>
      <CalendarClient />
    </>
  );
}

