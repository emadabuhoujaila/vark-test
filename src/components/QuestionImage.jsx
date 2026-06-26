const SCENE_VISUALS = {
  lab: { emoji: '🧪', label: 'تجربة المعمل', color: '#0d9488' },
  cell: { emoji: '🔬', label: 'الخلية', color: '#2563eb' },
  formula: { emoji: '📐', label: 'قانون علمي', color: '#7c3aed' },
  experiment: { emoji: '⚗️', label: 'خطوات التجربة', color: '#059669' },
  exam: { emoji: '📝', label: 'مراجعة', color: '#d97706' },
  digestion: { emoji: '🫀', label: 'جسم الإنسان', color: '#dc2626' },
  group: { emoji: '👥', label: 'عمل جماعي', color: '#0891b2' },
  energy: { emoji: '⚡', label: 'الطاقة', color: '#ca8a04' },
  motion: { emoji: '🏃', label: 'الحركة', color: '#4f46e5' },
  tools: { emoji: '🧰', label: 'أدوات المعمل', color: '#64748b' },
  team: { emoji: '🤝', label: 'مشروع جماعي', color: '#0d9488' },
  mistake: { emoji: '✏️', label: 'تصحيح', color: '#b45309' },
  steps: { emoji: '📋', label: 'ترتيب الخطوات', color: '#0369a1' },
  materials: { emoji: '🪨', label: 'المواد', color: '#57534e' },
  help: { emoji: '💡', label: 'طلب مساعدة', color: '#7c3aed' },
  general: { emoji: '🧬', label: 'علوم', color: '#0d9488' },
  fractions: { emoji: '🍕', label: 'الكسور', color: '#ea580c' },
  geometry: { emoji: '📐', label: 'الأشكال', color: '#2563eb' },
  equation: { emoji: '⚖️', label: 'المعادلات', color: '#7c3aed' },
  'word-problem': { emoji: '🛒', label: 'مسألة كلامية', color: '#059669' },
  graph: { emoji: '📊', label: 'الإحداثيات', color: '#0891b2' },
  percent: { emoji: '💯', label: 'النسبة المئوية', color: '#dc2626' },
  angles: { emoji: '📏', label: 'الزوايا', color: '#4f46e5' },
  multiplication: { emoji: '✖️', label: 'الضرب', color: '#b45309' },
  pattern: { emoji: '🔢', label: 'الأنماط', color: '#0d9488' },
  measure: { emoji: '📏', label: 'القياس', color: '#64748b' },
  homework: { emoji: '📓', label: 'الواجب', color: '#6366f1' },
  'math-general': { emoji: '📐', label: 'رياضيات', color: '#2563eb' },
  reading: { emoji: '📖', label: 'القراءة', color: '#059669' },
  grammar: { emoji: '✍️', label: 'النحو', color: '#7c3aed' },
  spelling: { emoji: '🔤', label: 'الإملاء', color: '#dc2626' },
  writing: { emoji: '📝', label: 'التعبير', color: '#2563eb' },
  poetry: { emoji: '🎭', label: 'الشعر', color: '#b45309' },
  vocabulary: { emoji: '📚', label: 'المفردات', color: '#0891b2' },
  analysis: { emoji: '🔍', label: 'التحليل', color: '#6366f1' },
  dictation: { emoji: '✏️', label: 'الإملاء', color: '#64748b' },
  rhetoric: { emoji: '💬', label: 'البلاغة', color: '#0d9488' },
  summary: { emoji: '📋', label: 'التلخيص', color: '#0369a1' },
  debate: { emoji: '🗣️', label: 'المناقشة', color: '#ea580c' },
  'arabic-general': { emoji: '📖', label: 'لغة عربية', color: '#059669' },
  listening: { emoji: '🎧', label: 'الاستماع', color: '#7c3aed' },
  dialogue: { emoji: '💬', label: 'حوار', color: '#0891b2' },
  'english-grammar': { emoji: '📝', label: 'قواعد', color: '#2563eb' },
  pronunciation: { emoji: '🗣️', label: 'النطق', color: '#ea580c' },
  speaking: { emoji: '🎤', label: 'محادثة', color: '#dc2626' },
  flashcards: { emoji: '🃏', label: 'بطاقات', color: '#6366f1' },
  video: { emoji: '🎬', label: 'فيديو', color: '#0d9488' },
  'english-general': { emoji: '🔤', label: 'إنجليزي', color: '#4f46e5' },
};

export default function QuestionImage({ scene, questionId, small }) {
  const visual = SCENE_VISUALS[scene] || SCENE_VISUALS.general;

  return (
    <div
      className={`question-image ${small ? 'question-image-sm' : ''}`}
      style={{ '--q-color': visual.color }}
      aria-hidden="true"
    >
      <span className="question-image-emoji">{visual.emoji}</span>
      {!small && (
        <>
          <span className="question-image-label">{visual.label}</span>
          <span className="question-image-meta">سؤال {questionId}</span>
        </>
      )}
    </div>
  );
}
