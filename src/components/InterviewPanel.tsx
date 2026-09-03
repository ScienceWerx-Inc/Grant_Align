'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

/**
 * The chat surface for both AI interviewers.
 *
 * The profile behind this panel is written on every turn, so `router.refresh()`
 * after each exchange makes the extracted fields visibly fill in on the page
 * beside the conversation. That feedback is the point: a respondent who can see
 * their answers landing in named fields gives far more concrete answers than
 * one typing into an opaque chat box.
 */
export function InterviewPanel({
  orgId,
  role,
  initialMessages,
  initialSessionId,
  initialDone,
}: {
  orgId: string;
  role: 'SEEKER' | 'DONOR';
  initialMessages: Message[];
  initialSessionId: string | null;
  initialDone: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(initialDone);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy]);

  async function send(text: string) {
    setBusy(true);
    setError(null);
    if (text) setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId, sessionId, answer: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'The interviewer could not respond.');

      setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      setDone(Boolean(data.done));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      // Drop the optimistic user bubble: leaving it makes the failed turn look
      // recorded, and the next send would then duplicate it.
      if (text) setMessages(prev => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = answer.trim();
    if (!text || busy) return;
    setAnswer('');
    void send(text);
  }

  const noun = role === 'SEEKER' ? 'organization' : 'foundation';

  return (
    <div className="flex h-[32rem] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="rounded-md bg-surface px-4 py-6 text-center text-sm text-muted">
            <p>
              The AI interviewer asks about what this {noun} really does — and, just as importantly,
              what it does not.
            </p>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => void send('')}
              disabled={busy}
            >
              {busy ? 'Starting…' : 'Start the interview'}
            </button>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm ${
                message.role === 'user'
                  ? 'bg-brand text-white'
                  : 'border border-line bg-white text-ink'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {busy && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-muted">
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-skip/10 px-3 py-2 text-xs text-skip">{error}</p>
      )}

      {done ? (
        <p className="mt-3 rounded-md bg-apply/10 px-3 py-2 text-xs text-apply">
          Interview complete — the profile beside this has been filled in. You can keep talking to
          refine it.
        </p>
      ) : null}

      {messages.length > 0 && (
        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input
            className="input"
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            placeholder="Type your answer…"
            disabled={busy}
          />
          <button type="submit" className="btn-primary" disabled={busy || !answer.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
