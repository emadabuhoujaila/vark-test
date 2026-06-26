import { SCIENCE_QUESTIONS } from './science.js';
import { MATH_QUESTIONS } from './math.js';
import { ARABIC_QUESTIONS } from './arabic.js';
import { ENGLISH_QUESTIONS } from './english.js';
import { ISLAMIC_QUESTIONS } from './islamic.js';
import { SUBJECTS } from '../subjects.js';

/** المواد التي لها بنك أسئلة جاهز — أضف مادة جديدة هنا تدريجياً */
export const SUBJECTS_WITH_QUESTIONS = ['science', 'math', 'arabic', 'english', 'islamic'];

const QUESTION_BANKS = {
  science: SCIENCE_QUESTIONS,
  math: MATH_QUESTIONS,
  arabic: ARABIC_QUESTIONS,
  english: ENGLISH_QUESTIONS,
  islamic: ISLAMIC_QUESTIONS,
};

export function hasQuestionsForSubject(subjectId) {
  return SUBJECTS_WITH_QUESTIONS.includes(subjectId);
}

export function getQuestionsForSubject(subjectId) {
  return QUESTION_BANKS[subjectId] || [];
}

export function getAllSubjectsForStudent() {
  return SUBJECTS.map((s) => ({
    ...s,
    hasQuestions: hasQuestionsForSubject(s.id),
  }));
}

/** رسائل حالة المادة للطالب */
export const SUBJECT_STATUS_MESSAGES = {
  open: null,
  waiting: 'انتظر فتح الاختبار — لم يُسجّل معلم لهذه المادة في شعبتك بعد',
  soon: 'الاختبار قيد الإعداد — ستُفتح هذه المادة قريباً',
  done: 'أنجزت هذا الاختبار مسبقاً',
};
