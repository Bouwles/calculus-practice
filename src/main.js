import katex from 'katex';
import 'katex/dist/katex.min.css';
import './style.css';
import { generateQuestion } from './questions.js';

const elements = Object.fromEntries([
  'score', 'reset', 'question-label', 'question', 'show-answer', 'skip', 'next',
  'feedback', 'correct-answer', 'explanation', 'rule',
].map((id) => [id, document.getElementById(id)]));
const modeButtons = [...document.querySelectorAll('[data-mode]')];
let mode = 'derivatives';
let question;
let revealed = false;
let shown = 0;

function renderMath(tex, element, displayMode = false) {
  katex.render(tex, element, { displayMode, throwOnError: true, trust: false });
}

function updateCount() {
  elements.score.textContent = `${shown} ${shown === 1 ? 'answer' : 'answers'} shown`;
}

function nextQuestion(focus = true) {
  question = generateQuestion(mode, question?.id);
  revealed = false;
  elements['question-label'].textContent = question.kind === 'integral' ? 'Find an antiderivative.' : 'Find the derivative.';
  renderMath(question.tex, elements.question, true);
  elements['show-answer'].hidden = false;
  elements.skip.hidden = false;
  elements.next.hidden = true;
  elements.feedback.hidden = true;
  if (focus) elements['show-answer'].focus({ preventScroll: true });
}

elements['show-answer'].addEventListener('click', () => {
  if (revealed) return;
  revealed = true;
  shown++;
  updateCount();
  renderMath(question.answerTex + (question.kind === 'integral' ? ' + C' : ''), elements['correct-answer']);
  elements.explanation.textContent = question.explanation;
  renderMath(question.ruleTex, elements.rule);
  elements.feedback.hidden = false;
  elements['show-answer'].hidden = true;
  elements.skip.hidden = true;
  elements.next.hidden = false;
  elements.next.focus({ preventScroll: true });
});

elements.skip.addEventListener('click', () => nextQuestion());
elements.next.addEventListener('click', () => nextQuestion());
elements.reset.addEventListener('click', () => {
  shown = 0;
  updateCount();
  nextQuestion();
});
modeButtons.forEach((button) => button.addEventListener('click', () => {
  if (mode === button.dataset.mode) return;
  mode = button.dataset.mode;
  modeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  nextQuestion();
}));

nextQuestion(false);
