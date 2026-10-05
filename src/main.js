import katex from 'katex';
import 'katex/dist/katex.min.css';
import './style.css';
import { generateQuestion } from './questions.js';
import { checkAnswer } from './answers.js';

const elements = Object.fromEntries([
  'score', 'reset', 'question-label', 'question', 'answer-form', 'answer', 'integral-constant',
  'input-hint', 'input-error', 'check', 'skip', 'next', 'feedback', 'feedback-title',
  'correct-answer', 'explanation', 'rule',
].map((id) => [id, document.getElementById(id)]));
const modeButtons = [...document.querySelectorAll('[data-mode]')];
let mode = 'derivatives';
let question;
let checked = false;
let correct = 0;
let attempted = 0;

function renderMath(tex, element, displayMode = false) {
  katex.render(tex, element, { displayMode, throwOnError: true, trust: false });
}

function updateScore() {
  elements.score.textContent = `${correct} / ${attempted} correct`;
}

function clearError() {
  elements['input-error'].hidden = true;
  elements['input-error'].textContent = '';
  elements.answer.removeAttribute('aria-invalid');
}

function nextQuestion(focus = true) {
  question = generateQuestion(mode, question?.id);
  checked = false;
  const integral = question.kind === 'integral';
  elements['question-label'].textContent = integral ? 'Find an antiderivative.' : 'Find the derivative.';
  renderMath(question.tex, elements.question, true);
  elements['integral-constant'].hidden = !integral;
  elements['input-hint'].textContent = integral
    ? 'Use x^2, sin(x), cos(x), or e^x. The + C is included.'
    : 'Use x^2 for powers, sin(x), cos(x), or e^x.';
  elements.answer.placeholder = integral ? 'e.g. x^3/3' : 'e.g. 3x^2';
  elements.answer.disabled = false;
  elements.answer.value = '';
  elements.check.disabled = false;
  elements.skip.hidden = false;
  elements.next.hidden = true;
  elements.feedback.hidden = true;
  clearError();
  if (focus) elements.answer.focus({ preventScroll: true });
}

elements['answer-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  if (checked) return;
  const result = checkAnswer(elements.answer.value, question);
  if (result.error) {
    elements['input-error'].textContent = result.error;
    elements['input-error'].hidden = false;
    elements.answer.setAttribute('aria-invalid', 'true');
    elements.answer.focus({ preventScroll: true });
    return;
  }
  checked = true;
  attempted++;
  if (result.correct) correct++;
  updateScore();
  clearError();
  elements['feedback-title'].textContent = result.correct ? 'Correct.' : 'Incorrect.';
  elements['feedback-title'].className = result.correct ? 'correct' : 'incorrect';
  renderMath(question.answerTex + (question.kind === 'integral' ? ' + C' : ''), elements['correct-answer']);
  elements.explanation.textContent = question.explanation;
  renderMath(question.ruleTex, elements.rule);
  elements.feedback.hidden = false;
  elements.answer.disabled = true;
  elements.check.disabled = true;
  elements.skip.hidden = true;
  elements.next.hidden = false;
  elements.next.focus({ preventScroll: true });
});

elements.answer.addEventListener('input', clearError);
elements.skip.addEventListener('click', () => nextQuestion());
elements.next.addEventListener('click', () => nextQuestion());
elements.reset.addEventListener('click', () => {
  correct = attempted = 0;
  updateScore();
  nextQuestion();
});
modeButtons.forEach((button) => button.addEventListener('click', () => {
  if (mode === button.dataset.mode) return;
  mode = button.dataset.mode;
  modeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  nextQuestion();
}));

renderMath('+ C', elements['integral-constant']);
nextQuestion(false);
