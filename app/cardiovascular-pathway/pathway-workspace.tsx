"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { cardiovascularPathwayNodes, cardiovascularProgressTest, professorPrompts, type PathwayNode, type ProfessorPrompt } from "@/lib/cardiovascular-pathway";

type Confidence = "low" | "medium" | "high";
type NodeState = PathwayNode & { state: string; evidence: string; gate: string };
type Summary = { foundationsComplete: number; clinicalObjectives: number; sourceApproved: number; lessonReady: number; professorAttempts: number; progressTests: number };
type ProfessorResult = { score: number; correct: boolean; matched: string[]; missing: string[]; modelAnswer: string; sourceLabel: string; href: string; note: string };
type TestResult = { correctCount: number; totalCount: number; domainScores: Record<string, number>; tierScores: Record<string, number>; highConfidenceWrong: number; intervalDays: number; nextTestAt: string; results: Array<{ questionId: string; selected: number; correct: boolean; correctOption: number; correction: string; sourceLabel: string }> };
type PathwayResponse = {
  nodes: NodeState[];
  professor: { prompt: ProfessorPrompt; reason: string; attempts: number; weakDomain: string };
  progressTest: typeof cardiovascularProgressTest & { attempts: number; due: boolean; nextTestAt: string | null; latest: { correctCount: number; totalCount: number; completedAt: string; domainScores: Record<string, number> } | null };
  summary: Summary;
};

const initialNodes: NodeState[] = cardiovascularPathwayNodes.map((node, index) => ({
  ...node,
  state: index === 0 ? "ready" : node.kind === "foundation" ? "locked" : "source_gate",
  evidence: node.kind === "foundation" ? "Loading saved lesson evidence…" : "Clinical teaching locked",
  gate: node.kind === "foundation" ? "Live source-trailed lesson" : "Approve the exact chapter and page first",
}));

const initialSummary: Summary = { foundationsComplete: 0, clinicalObjectives: 12, sourceApproved: 0, lessonReady: 0, professorAttempts: 0, progressTests: 0 };

const stateLabels: Record<string, string> = {
  complete: "Evidence complete",
  active: "Continue",
  ready: "Ready now",
  locked: "Prerequisite first",
  source_gate: "Source gate",
  source_ready: "Source approved",
  lesson_ready: "Lesson draft ready",
};

function formatDate(value: string | null) {
  if (!value) return "Ready now";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function CardiovascularPathwayWorkspace() {
  const [nodes, setNodes] = useState<NodeState[]>(initialNodes);
  const [summary, setSummary] = useState(initialSummary);
  const [professor, setProfessor] = useState<PathwayResponse["professor"]>({ prompt: professorPrompts[0], reason: "Your saved evidence will choose the first explanation.", attempts: 0, weakDomain: "cardiac-cycle" });
  const [progressTest, setProgressTest] = useState<PathwayResponse["progressTest"]>({ ...cardiovascularProgressTest, attempts: 0, due: true, nextTestAt: null, latest: null });
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [confidence, setConfidence] = useState<Confidence | "">("");
  const [hintLevel, setHintLevel] = useState(0);
  const [professorMessage, setProfessorMessage] = useState("");
  const [professorResult, setProfessorResult] = useState<ProfessorResult | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidences, setConfidences] = useState<Record<string, Confidence>>({});
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPathway = useCallback(async () => {
    try {
      const request = await fetch("/api/cardiovascular-pathway");
      const data = await request.json() as PathwayResponse;
      if (!request.ok) throw new Error();
      setNodes(data.nodes);
      setSummary(data.summary);
      setProfessor(data.professor);
      setProgressTest(data.progressTest);
    } catch {
      setProfessorMessage("Saved evidence is temporarily unavailable. The safe starter pathway remains visible.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPathway().catch(() => undefined); }, [loadPathway]);

  const nodeNameMap = useMemo(() => new Map(nodes.map((node) => [node.id, node.title])), [nodes]);
  const groupedNodes = useMemo(() => [
    { label: "Foundations", nodes: nodes.filter((node) => node.kind === "foundation") },
    { label: "Week I", nodes: nodes.filter((node) => node.week === "I") },
    { label: "Week II", nodes: nodes.filter((node) => node.week === "II") },
    { label: "Week III", nodes: nodes.filter((node) => node.week === "III") },
  ], [nodes]);
  const currentQuestion = progressTest.questions[questionIndex];

  async function checkProfessor() {
    if (response.trim().length < 10 || !confidence) { setProfessorMessage("Explain the mechanism in your own words and choose your confidence first."); return; }
    setSubmitting(true); setProfessorMessage("Checking the links in your explanation…");
    try {
      const request = await fetch("/api/cardiovascular-pathway", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "professor", promptId: professor.prompt.id, response, confidence, hintLevel }) });
      const data = await request.json() as ProfessorResult & { error?: string };
      if (!request.ok) throw new Error(data.error ?? "The explanation could not be saved.");
      setProfessorResult(data);
      setProfessorMessage(data.correct ? "The core mechanism links are present. The explanation is saved as learning evidence." : "A gap was found and added to your correction loop.");
    } catch (error) { setProfessorMessage(error instanceof Error ? error.message : "The explanation could not be saved."); }
    finally { setSubmitting(false); }
  }

  async function nextProfessorChallenge() {
    setResponse(""); setConfidence(""); setHintLevel(0); setProfessorResult(null); setProfessorMessage("Choosing the next prompt from your updated evidence…");
    await loadPathway();
    setProfessorMessage("");
  }

  function moveQuestion(direction: number) {
    if (direction > 0 && (!Number.isInteger(answers[currentQuestion.id]) || !confidences[currentQuestion.id])) {
      setTestMessage("Choose an answer and confidence before moving on."); return;
    }
    setQuestionIndex((current) => Math.max(0, Math.min(progressTest.questions.length - 1, current + direction)));
    setTestMessage("");
  }

  async function finishTest() {
    if (progressTest.questions.some((question) => !Number.isInteger(answers[question.id]) || !confidences[question.id])) {
      setTestMessage("Complete every question and confidence judgement before finishing."); return;
    }
    setSubmitting(true); setTestMessage("Scoring the cumulative test and setting the next interval…");
    try {
      const request = await fetch("/api/cardiovascular-pathway", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "progress_test", testId: progressTest.id, answers, confidences }) });
      const data = await request.json() as TestResult & { error?: string };
      if (!request.ok) throw new Error(data.error ?? "The progress test could not be saved.");
      setTestResult(data);
      setTestMessage(`${data.correctCount} of ${data.totalCount} correct. Your next mixed test is scheduled in ${data.intervalDays} ${data.intervalDays === 1 ? "day" : "days"}.`);
      await loadPathway();
    } catch (error) { setTestMessage(error instanceof Error ? error.message : "The progress test could not be saved."); }
    finally { setSubmitting(false); }
  }

  function restartTest() {
    setAnswers({}); setConfidences({}); setQuestionIndex(0); setTestResult(null); setTestMessage("");
  }

  return <div className="cardio-pathway-page">
    <header className="cardio-pathway-hero">
      <div><span className="eyebrow"><i /> Improvements 41–44 · Connected learning system</span><h1>One subject.<br />Every learning link.</h1><p>Cardiovascular Medicine is now the model pathway: prerequisites first, all syllabus objectives visible, source gates intact, explanations adapted to your errors, and old knowledge repeatedly mixed with new.</p><div><a className="primary-button primary-button--dark" href="#pathway-map">Open the pathway <span>↓</span></a><a href="#professor-2">Start Professor Mode 2.0 →</a></div></div>
      <div className="pathway-hero-score"><span>Gold-standard cardiovascular route</span><strong>{summary.foundationsComplete}<small>/ 2 foundations complete</small></strong><div><span><b>{summary.clinicalObjectives}</b><small>syllabus objectives</small></span><span><b>{summary.sourceApproved}</b><small>source approved</small></span><span><b>{summary.lessonReady}</b><small>lesson ready</small></span></div><p>{loading ? "Connecting your saved evidence. Nothing clinical unlocks by guesswork." : "Nothing clinical unlocks by guesswork. The pathway shows the exact next gate."}</p></div>
    </header>

    <section className="subject-learning-loop" aria-labelledby="subject-loop-title"><header className="section-header"><div><span className="eyebrow">41 · Complete subject route</span><h2 id="subject-loop-title">The complete learning loop</h2></div><span>Every activity returns evidence to the pathway</span></header><div><a href="/diagnostic"><span>01</span><strong>Diagnose</strong><p>Find the weak prerequisite.</p></a><a href="/learn/cardiovascular/cardiac-cycle"><span>02</span><strong>Learn</strong><p>Build the source-trailed mechanism.</p></a><a href="#professor-2"><span>03</span><strong>Explain</strong><p>Teach it back without options.</p></a><a href="/cases"><span>04</span><strong>Apply</strong><p>Use it in a progressive case.</p></a><a href="/viva"><span>05</span><strong>Perform</strong><p>Use the viva and clinical rubric.</p></a><a href="#progress-test"><span>06</span><strong>Retest</strong><p>Mix old and new after a delay.</p></a></div></section>

    <section id="pathway-map" className="competency-pathway" aria-labelledby="pathway-map-title">
      <header className="section-header"><div><span className="eyebrow">43 · Prerequisite and competency graph</span><h2 id="pathway-map-title">Foundation → objective → clinical performance</h2></div><a href="/coverage">Inspect exact source gaps →</a></header>
      <div className="pathway-groups">{groupedNodes.map((group) => <section key={group.label}><header><strong>{group.label}</strong><small>{group.nodes.length} {group.nodes.length === 1 ? "step" : "steps"}</small></header><div>{group.nodes.map((node) => <article className={`pathway-objective pathway-objective--${node.state}`} key={node.id}><header><span>{node.kind === "foundation" ? "F" : node.week}</span><b>{stateLabels[node.state] ?? node.state}</b></header><h3>{node.title}</h3><p>{node.objective}</p><div className="competency-proof"><small>Competency proof</small><strong>{node.competency}</strong></div>{node.prerequisites.length ? <div className="prerequisite-list"><small>Requires</small>{node.prerequisites.map((id) => <span key={id}>← {nodeNameMap.get(id) ?? id}</span>)}</div> : <div className="prerequisite-list"><small>Starts here</small><span>No earlier pathway node</span></div>}<footer><span><small>{node.evidence}</small><em>{node.gate}</em></span><a href={node.href}>{node.state === "source_gate" ? "Open gate" : "Open"} →</a></footer></article>)}</div></section>)}</div>
    </section>

    <section id="professor-2" className="professor-two" aria-labelledby="professor-two-title">
      <header><div><span className="eyebrow">42 · Adaptive Professor Mode 2.0</span><h2 id="professor-two-title">Explain the link your evidence says is weakest.</h2><p>{professor.reason}</p></div><div><strong>{professor.attempts}</strong><span>adaptive explanations saved</span><small>Current focus · {professor.weakDomain === "cardiac-cycle" ? "Cardiac cycle" : "Cardiac output"}</small></div></header>
      <div className="professor-two-stage"><article><header><span>Professor asks</span><small>{professor.prompt.sourceLabel}</small></header><h3>{professor.prompt.title}</h3><blockquote>{professor.prompt.prompt}</blockquote><label htmlFor="professor-response"><span>Your teach-back</span><textarea id="professor-response" value={response} disabled={Boolean(professorResult)} onChange={(event) => setResponse(event.target.value)} placeholder="Build the mechanism one causal step at a time…" /></label><div className="professor-confidence"><span>Before checking, how certain are you?</span>{(["low", "medium", "high"] as const).map((level) => <button className={confidence === level ? "is-active" : ""} type="button" disabled={Boolean(professorResult)} onClick={() => setConfidence(level)} key={level}>{level}</button>)}</div><div className="professor-hints"><span>Progressive hints · use only what you need</span>{professor.prompt.hints.map((hint, index) => <button className={hintLevel > index ? "is-visible" : ""} type="button" disabled={Boolean(professorResult) || hintLevel < index} onClick={() => setHintLevel((current) => Math.max(current, index + 1))} key={hint}>{hintLevel > index ? hint : `Reveal hint ${index + 1}`}</button>)}</div><footer>{professorResult ? <button type="button" onClick={nextProfessorChallenge}>Next adaptive challenge <span>→</span></button> : <button type="button" disabled={submitting} onClick={checkProfessor}>{submitting ? "Checking…" : "Check my explanation"}<span>→</span></button>}<a href={professor.prompt.href}>Review the source-trailed lesson</a></footer></article>
        <aside className={professorResult?.correct ? "is-strong" : professorResult ? "is-repair" : ""}><span>{professorResult ? `${professorResult.score}%` : "⌁"}</span><h3>{professorResult ? professorResult.correct ? "Core links present" : "Repair the missing links" : "Evidence-aware, not free-form grading"}</h3>{professorResult ? <><div><small>Links detected</small>{professorResult.matched.length ? professorResult.matched.map((item) => <b key={item}>✓ {item}</b>) : <b>No required link detected yet</b>}</div><div><small>Still missing</small>{professorResult.missing.length ? professorResult.missing.map((item) => <b key={item}>○ {item}</b>) : <b>None in this checklist</b>}</div><blockquote><small>Professor explanation · not a quotation</small>{professorResult.modelAnswer}</blockquote><p>{professorResult.note}</p></> : <><p>The prompt is selected from diagnostic scores, confidence risks, open mistakes, and previous teach-back attempts.</p><ol><li>Answer before seeing the model.</li><li>Hints reduce the strength of the evidence.</li><li>Missing links enter the correction loop.</li><li>Equivalent wording still deserves human judgement.</li></ol></>}{professorMessage ? <em role="status">{professorMessage}</em> : null}</aside>
      </div>
    </section>

    <section id="progress-test" className="cumulative-test" aria-labelledby="progress-test-title">
      <header><div><span className="eyebrow">44 · Cumulative progress testing</span><h2 id="progress-test-title">Old knowledge stays in the room.</h2><p>Eight mixed questions rotate repair, retention, and transfer. Confidence is captured before feedback, then the next test is scheduled from stability and risk.</p></div><div className={progressTest.due ? "is-due" : ""}><span>{progressTest.due ? "Test due" : "Next test"}</span><strong>{formatDate(progressTest.nextTestAt)}</strong><small>{progressTest.attempts} cumulative {progressTest.attempts === 1 ? "test" : "tests"} saved</small></div></header>
      <div className="test-ribbon" aria-label={`Question ${questionIndex + 1} of ${progressTest.questions.length}`}>{progressTest.questions.map((question, index) => <button className={`${index === questionIndex ? "is-current" : ""} ${Number.isInteger(answers[question.id]) ? "is-answered" : ""}`} type="button" onClick={() => setQuestionIndex(index)} key={question.id}><span>{Number.isInteger(answers[question.id]) ? "✓" : index + 1}</span><small>{question.tier}</small></button>)}</div>
      <article className="progress-question"><header><div><span>{currentQuestion.domain === "cardiac-cycle" ? "Cardiac cycle" : "Cardiac output"} · {currentQuestion.tier}</span><h3>{currentQuestion.prompt}</h3></div><small>Question {questionIndex + 1} of {progressTest.questions.length}</small></header><div className="progress-options">{currentQuestion.options.map((option, optionIndex) => { const itemResult = testResult?.results.find((item) => item.questionId === currentQuestion.id); return <button className={`${answers[currentQuestion.id] === optionIndex ? "is-selected" : ""} ${itemResult && optionIndex === itemResult.correctOption ? "is-correct" : ""} ${itemResult && answers[currentQuestion.id] === optionIndex && !itemResult.correct ? "is-incorrect" : ""}`} type="button" disabled={Boolean(testResult)} onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: optionIndex }))} key={option}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>; })}</div><div className="progress-confidence"><span>Confidence before feedback</span>{(["low", "medium", "high"] as const).map((level) => <button className={confidences[currentQuestion.id] === level ? "is-active" : ""} type="button" disabled={Boolean(testResult)} onClick={() => setConfidences((current) => ({ ...current, [currentQuestion.id]: level }))} key={level}>{level}</button>)}</div>{testResult ? <aside className={testResult.results.find((item) => item.questionId === currentQuestion.id)?.correct ? "is-correct" : "is-incorrect"}><strong>{testResult.results.find((item) => item.questionId === currentQuestion.id)?.correct ? "Retained" : "Correction"}</strong><p>{testResult.results.find((item) => item.questionId === currentQuestion.id)?.correction}</p><small>{currentQuestion.sourceLabel}</small></aside> : null}{testMessage ? <p className="progress-test-message" role="status">{testMessage}</p> : null}<footer><button type="button" disabled={questionIndex === 0} onClick={() => moveQuestion(-1)}>← Previous</button>{testResult ? <><div><strong>{testResult.correctCount}/{testResult.totalCount}</strong><span>{testResult.highConfidenceWrong} confidence risks · next in {testResult.intervalDays}d</span></div><button type="button" onClick={restartTest}>Start fresh</button></> : questionIndex < progressTest.questions.length - 1 ? <button type="button" onClick={() => moveQuestion(1)}>Save and continue <span>→</span></button> : <button type="button" disabled={submitting} onClick={finishTest}>{submitting ? "Scheduling…" : "Finish and schedule"}<span>✓</span></button>}</footer></article>
      {testResult ? <section className="progress-domain-result"><article><span>Cardiac cycle</span><strong>{testResult.domainScores["cardiac-cycle"]}%</strong><p>Pressure, valves, volume, and sounds</p></article><article><span>Cardiac output</span><strong>{testResult.domainScores["cardiac-output"]}%</strong><p>Flow, loading, and calculation</p></article><article><span>Transfer</span><strong>{testResult.tierScores.transfer}%</strong><p>Use the mechanism in a changed context</p></article><a href="/mistakes">Open saved corrections →</a></section> : null}
    </section>

    <aside className="pathway-source-rule"><span>⌁</span><div><strong>The subject can grow without becoming unsafe.</strong><p>All 12 clinical objectives are connected now, but disease teaching stays locked until its exact uploaded section, chapter mapping, and human review are ready.</p></div><a href="/alignment">Review source gates</a></aside>
  </div>;
}
