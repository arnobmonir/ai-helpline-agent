export function PhoneGlyph({
  connected,
  className = "h-10 w-10",
}: {
  connected: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7.5 3.75h2.2c.4 0 .74.3.82.7l.7 3.2a.85.85 0 0 1-.24.8l-1.3 1.3a12.2 12.2 0 0 0 5.07 5.07l1.3-1.3a.85.85 0 0 1 .8-.24l3.2.7c.4.08.7.42.7.82v2.2c0 .47-.38.85-.85.85C10.9 18.85 5.15 13.1 5.15 4.6c0-.47.38-.85.85-.85Z"
        fill="currentColor"
      />
      {connected && (
        <circle cx="18.5" cy="5.5" r="2" fill="currentColor" opacity="0.85" />
      )}
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 14.5a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4.5a3 3 0 0 0 3 3Z" />
      <path d="M7 11.2a1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-1.87A7 7 0 0 0 19 11.2a1 1 0 1 0-2 0 5 5 0 0 1-10 0Z" />
    </svg>
  );
}

export function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M4.2 3.8 20.2 19.8a1 1 0 0 1-1.4 1.4L15.3 17.7A7 7 0 0 1 13 18.13V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-1.87a7 7 0 0 1-6-6.93 1 1 0 0 1 2 0 5 5 0 0 0 5.3 5l-1.5-1.5A3 3 0 0 1 9 11.5V10L4.2 5.2A1 1 0 0 1 5.6 3.8L4.2 3.8ZM15 11.2V7a3 3 0 0 0-5.7-1.3L15 11.2Z" />
    </svg>
  );
}

export function HangupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M21 8.5c-5.7-3.4-12.3-3.4-18 0A2 2 0 0 0 2 10.3l1.2 2.1a1.5 1.5 0 0 0 1.8.6l2.5-1a1.5 1.5 0 0 0 .9-1.4V9.2c3.2-.8 6.6-.8 9.8 0v1.4c0 .6.4 1.2.9 1.4l2.5 1a1.5 1.5 0 0 0 1.8-.6L22 10.3a2 2 0 0 0-1-1.8Z" />
    </svg>
  );
}

export function GearIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.2 7.2 0 0 0-1.7-1L14.4 2a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.2 7.2 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1L2.5 14.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1a7.2 7.2 0 0 0 1.7 1l.4 2.6a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a7.2 7.2 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  );
}
