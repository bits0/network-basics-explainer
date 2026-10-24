import { useState } from "react";
import { SectionHead, ControlButton, IconRestart } from "../components/terminal";
import { QUIZ } from "../lib/layers";

export default function Quiz() {
  const [picked, setPicked] = useState<Record<number, number>>({});

  const answered = Object.keys(picked).length;
  const score = QUIZ.reduce(
    (acc, q, i) => acc + (picked[i] === q.answer ? 1 : 0),
    0
  );

  return (
    <div>
      <SectionHead
        index="07 :: SELF-CHECK"
        title="Ping your understanding"
        sub="Six probes. Answer all of them — every reply comes back with an ACK or a NACK plus the reason why."
      />

      <div className="flex flex-col gap-4">
        {QUIZ.map((q, qi) => {
          const p = picked[qi];
          const doneQ = p !== undefined;
          return (
            <div key={qi} className="terminal-frame p-4 md:p-5">
              <p className="text-sm md:text-base leading-relaxed">
                <span className="text-phosphor-faint mr-2">
                  q{String(qi + 1).padStart(2, "0")}
                </span>
                {q.q}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const isPicked = p === oi;
                  const isRight = q.answer === oi;
                  let cls =
                    "border-phosphor-dim text-phosphor-muted hover:border-phosphor hover:text-phosphor";
                  if (doneQ && isRight)
                    cls =
                      "border-phosphor bg-[rgba(0,244,142,0.16)] text-phosphor-bright";
                  else if (doneQ && isPicked)
                    cls = "border-phosphor-dim text-phosphor-faint line-through";
                  else if (doneQ)
                    cls = "border-phosphor-dim text-phosphor-faint opacity-60";
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={doneQ}
                      onClick={() =>
                        setPicked((prev) => ({ ...prev, [qi]: oi }))
                      }
                      className={`min-h-11 border px-3 py-2 text-left text-xs md:text-sm cursor-pointer
                        transition-colors duration-150 disabled:cursor-default
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${cls}`}
                    >
                      <span className="mr-2 text-phosphor-faint">
                        {String.fromCharCode(97 + oi)})
                      </span>
                      {opt}
                      {doneQ && isRight && (
                        <span className="ml-2 text-phosphor-bright">[ACK]</span>
                      )}
                      {doneQ && isPicked && !isRight && (
                        <span className="ml-2 no-underline">[NACK]</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {doneQ && (
                <p className="mt-3 border-l-2 border-[var(--phosphor-dim)] pl-3 text-xs md:text-sm leading-relaxed text-phosphor-muted">
                  {q.why}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 terminal-frame flex flex-wrap items-center gap-3 px-4 py-3">
        <p className="text-sm">
          {answered === QUIZ.length ? (
            <>
              transmission complete — score{" "}
              <span className="text-phosphor-bright glow-soft">
                {score}/{QUIZ.length}
              </span>{" "}
              {score === QUIZ.length
                ? ":: flawless. you may now say 'it's a layer 3 problem' with confidence."
                : score >= QUIZ.length / 2
                  ? ":: solid signal. re-run the encapsulation demo and retry the misses."
                  : ":: high packet loss. scroll up, watch the stack again, then retransmit."}
            </>
          ) : (
            <>
              answered{" "}
              <span className="text-phosphor-bright">
                {answered}/{QUIZ.length}
              </span>{" "}
              — keep going
            </>
          )}
        </p>
        {answered > 0 && (
          <span className="ml-auto">
            <ControlButton
              label="Reset quiz"
              onClick={() => setPicked({})}
            >
              {IconRestart}
            </ControlButton>
          </span>
        )}
      </div>
    </div>
  );
}
