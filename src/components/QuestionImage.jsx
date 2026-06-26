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
  general: { emoji: '✨', label: 'نشاط تعليمي', color: '#0d9488' },
  classroom: { emoji: '🏫', label: 'الحصة', color: '#2563eb' },
  homework: { emoji: '📓', label: 'الواجب', color: '#6366f1' },
  reading: { emoji: '📚', label: 'قراءة', color: '#059669' },
  math: { emoji: '🔢', label: 'حساب', color: '#ea580c' },
  language: { emoji: '📖', label: 'لغة', color: '#059669' },
  video: { emoji: '🎬', label: 'فيديو', color: '#7c3aed' },
  memory: { emoji: '🧠', label: 'تذكّر', color: '#0891b2' },
  explain: { emoji: '💬', label: 'شرح', color: '#0d9488' },
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
