import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MessagesPanel from '../../components/MessagesPanel';
import {
  teacherGetMessagesInbox,
  teacherGetMessagesOutbox,
  teacherGetMessage,
  teacherSendMessage,
  teacherReplyMessage,
  teacherDeleteMessage,
  isTeacherLoggedIn,
  clearTeacherAuth,
} from '../../utils/api';

export default function TeacherMessagesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTeacherLoggedIn()) navigate('/teacher');
  }, [navigate]);

  function logout() {
    clearTeacherAuth();
    navigate('/teacher');
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-top">
        <div>
          <h1>✉️ مراسلة التنظيم</h1>
          <p className="muted">صندوق الوارد · الصادر · إرسال رسالة</p>
        </div>
        <div className="dashboard-actions">
          <Link to="/teacher/home" className="btn btn-secondary">لوحة المعلم</Link>
          <button type="button" className="btn btn-secondary" onClick={logout}>خروج</button>
        </div>
      </div>

      <MessagesPanel
        mode="teacher"
        fetchInbox={teacherGetMessagesInbox}
        fetchOutbox={teacherGetMessagesOutbox}
        fetchMessage={teacherGetMessage}
        sendMessage={({ subject, body }) => teacherSendMessage({ subject, body })}
        replyMessage={(id, body) => teacherReplyMessage(id, body)}
        deleteMessage={teacherDeleteMessage}
      />
    </div>
  );
}
