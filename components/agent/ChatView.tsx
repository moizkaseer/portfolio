"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { agentStore } from "@/lib/agent/store";
import { ask, stop } from "@/lib/agent/entry";
import { formatAnswer } from "@/lib/agent/format";
import styles from "./Agent.module.css";

export const SUGGESTIONS = ["Show me your best project", "What do you build?", "How do you make agents reliable?", "Are you available?"];

/**
 * The conversation (Main.html terminal): visitor messages right-aligned, the agent's tool calls
 * as trace rows, the answer streaming with a block cursor. Rendered in section 06 on the home
 * page and in the floating panel / bottom sheet everywhere else — one shared conversation.
 */
export function ChatView({ variant, onClose, initialInput = "" }: { variant: "section" | "panel"; onClose?: () => void; initialInput?: string }) {
  const s = useSyncExternalStore(agentStore.subscribe, agentStore.get, agentStore.get);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const b = bodyRef.current;
    if (b) b.scrollTop = b.scrollHeight;
  }, [s.messages]);

  useEffect(() => {
    if (variant === "panel" || document.activeElement?.hasAttribute("data-agent-input")) inputRef.current?.focus();
  }, [variant]);

  const status = s.acting ? "Acting on the page" : s.mode === "demo" ? "Demo replay" : s.busy ? "Thinking" : "Live";

  return (
    <div className={styles.view} data-variant={variant} data-agent-live>
      <div className={styles.head}>
        <span>Agent · session {s.session}</span>
        <span className={styles.status}>
          <span aria-hidden="true" className={styles.sq} data-on={s.busy || s.mode === "demo"} />
          {status}
          {onClose && (
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close the agent">
              ✕
            </button>
          )}
        </span>
      </div>

      <div ref={bodyRef} className={styles.body} role="log" aria-live="polite" aria-label="Conversation with the agent">
        {s.messages.length === 0 && (
          <div className={styles.empty}>
            <p>
              {s.mode === "demo"
                ? "Demo replay: recorded answers, with the same tools and page actions as the live agent."
                : "Ask about the work. I answer from the case studies and can show you around the site."}
            </p>
            {variant === "panel" && (
              <div className={styles.chips}>
                {SUGGESTIONS.map((q) => (
                  <button key={q} type="button" className={styles.chip} onClick={() => ask(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {s.messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className={styles.user}>
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={styles.agent}>
              {m.tools.map((t) => (
                <div key={t.id} className={styles.tool} data-state={t.state}>
                  <span className={styles.call}>
                    <span aria-hidden="true" className={styles.dot} />
                    {t.label}
                  </span>
                  <span className={styles.result}>{t.meta}</span>
                </div>
              ))}
              {(m.text || m.streaming) && (
                <p className={styles.answer}>
                  {formatAnswer(m.text).map((p, i) =>
                    typeof p === "string" ? (
                      p
                    ) : (
                      <a key={i} href={p.href} {...(p.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {p.label}
                      </a>
                    ),
                  )}
                  {m.streaming && <span aria-hidden="true" className={styles.cursor} />}
                </p>
              )}
              {m.notice && <p className={styles.notice}>{m.notice}</p>}
            </div>
          ),
        )}
      </div>

      <form
        className={styles.inputRow}
        onSubmit={(e) => {
          e.preventDefault();
          const v = inputRef.current!.value;
          inputRef.current!.value = "";
          void ask(v);
        }}
      >
        <label htmlFor={`agent-input-${variant}`} className="sr-only">
          Ask the agent
        </label>
        <input
          ref={inputRef}
          id={`agent-input-${variant}`}
          className={styles.input}
          defaultValue={initialInput}
          maxLength={500}
          autoComplete="off"
          placeholder={s.mode === "demo" ? "Ask the agent — demo replay…" : "Ask the agent anything…"}
          onKeyDown={(e) => e.key === "Escape" && onClose?.()}
        />
        {s.busy ? (
          <button type="button" className={styles.send} onClick={() => void stop()}>
            Stop
          </button>
        ) : (
          <button type="submit" className={styles.send}>
            Send ↵
          </button>
        )}
      </form>
    </div>
  );
}
