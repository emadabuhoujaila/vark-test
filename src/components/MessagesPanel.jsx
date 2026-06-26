import { useEffect, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-SA');
}

export default function MessagesPanel({
  mode,
  teachers = [],
  fetchInbox,
  fetchOutbox,
  fetchMessage,
  sendMessage,
  replyMessage,
  deleteMessage,
}) {
  const [view, setView] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [compose, setCompose] = useState({ teacherId: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  async function loadList() {
    setLoading(true);
    setError('');
    try {
      const data = view === 'inbox' ? await fetchInbox() : await fetchOutbox();
      setMessages(data);
      setSelected(null);
      setThread([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [view]);

  async function openMessage(msg) {
    setError('');
    try {
      const data = await fetchMessage(msg.id);
      setSelected(data.message);
      setThread(data.thread || []);
      setReplyText('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      if (mode === 'admin' && !compose.teacherId) {
        throw new Error('اختر المعلم');
      }
      await sendMessage(compose);
      setShowCompose(false);
      setCompose({ teacherId: '', subject: '', body: '' });
      if (view === 'outbox') loadList();
      else setView('outbox');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setSending(true);
    setError('');
    try {
      await replyMessage(selected.id, replyText.trim());
      const data = await fetchMessage(selected.id);
      setSelected(data.message);
      setThread(data.thread || []);
      setReplyText('');
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(msg) {
    if (!window.confirm('حذف هذه الرسالة؟')) return;
    setError('');
    try {
      await deleteMessage(msg.id);
      setSelected(null);
      setThread([]);
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  const canReply = selected && view === 'inbox';

  return (
    <div className="messages-panel">
      <div className="messages-toolbar">
        <div className="sub-tabs">
          <button type="button" className={view === 'inbox' ? 'active' : ''} onClick={() => setView('inbox')}>
            📥 الوارد
          </button>
          <button type="button" className={view === 'outbox' ? 'active' : ''} onClick={() => setView('outbox')}>
            📤 الصادر
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCompose(true)}>
          ✉️ رسالة جديدة
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="messages-layout">
        <div className="messages-list card">
          {loading ? (
            <p className="muted">جاري التحميل...</p>
          ) : messages.length === 0 ? (
            <p className="muted empty-state compact">لا توجد رسائل</p>
          ) : (
            messages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                className={`message-item ${selected?.id === msg.id ? 'active' : ''} ${
                  view === 'inbox' && mode === 'admin' && !msg.readByAdminAt ? 'unread' : ''
                } ${view === 'inbox' && mode === 'teacher' && !msg.readByTeacherAt ? 'unread' : ''}`}
                onClick={() => openMessage(msg)}
              >
                <strong>{msg.subject}</strong>
                <span className="message-meta">
                  {mode === 'admin' && (
                    <span>{msg.teacherName || msg.teacherEmail || 'معلم'}</span>
                  )}
                  <span>{formatDate(msg.createdAt)}</span>
                </span>
                <span className="message-preview">{msg.body.slice(0, 80)}{msg.body.length > 80 ? '…' : ''}</span>
              </button>
            ))
          )}
        </div>

        <div className="message-detail card">
          {!selected ? (
            <p className="muted empty-state compact">اختر رسالة لعرضها</p>
          ) : (
            <>
              <div className="message-detail-head">
                <div>
                  <h3>{selected.subject}</h3>
                  <p className="muted message-meta">
                    {mode === 'admin' && (
                      <span>{selected.teacherName || selected.teacherEmail} · </span>
                    )}
                    {formatDate(selected.createdAt)}
                  </p>
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(selected)}>
                  حذف
                </button>
              </div>

              <div className="message-thread">
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`thread-bubble ${m.senderType === 'admin' ? 'from-admin' : 'from-teacher'}`}
                  >
                    <div className="thread-bubble-head">
                      <strong>{m.senderType === 'admin' ? 'التنظيم' : (m.teacherName || 'معلم')}</strong>
                      <span>{formatDate(m.createdAt)}</span>
                    </div>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>

              {canReply && (
                <form onSubmit={handleReply} className="message-reply-form">
                  <label>
                    الرد
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      required
                      placeholder="اكتب ردك..."
                    />
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
                    {sending ? 'جاري الإرسال...' : '↩️ رد'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)} role="presentation">
          <div className="modal-card admin-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>✉️ رسالة جديدة</h3>
            <form onSubmit={handleSend} className="student-form">
              {mode === 'admin' && (
                <label>
                  المعلم
                  <select
                    value={compose.teacherId}
                    onChange={(e) => setCompose({ ...compose, teacherId: e.target.value })}
                    required
                  >
                    <option value="">— اختر —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName || t.email}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                الموضوع
                <input
                  value={compose.subject}
                  onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                  required
                />
              </label>
              <label>
                النص
                <textarea
                  value={compose.body}
                  onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                  rows={5}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompose(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'جاري الإرسال...' : 'إرسال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
