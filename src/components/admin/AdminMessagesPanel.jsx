import MessagesPanel from '../MessagesPanel';
import {
  adminGetMessagesInbox,
  adminGetMessagesOutbox,
  adminGetMessage,
  adminSendMessage,
  adminReplyMessage,
  adminDeleteMessage,
} from '../../utils/api';

export default function AdminMessagesPanel({ teachers }) {
  return (
    <MessagesPanel
      mode="admin"
      teachers={teachers}
      fetchInbox={adminGetMessagesInbox}
      fetchOutbox={adminGetMessagesOutbox}
      fetchMessage={adminGetMessage}
      sendMessage={({ teacherId, subject, body }) => adminSendMessage({ teacherId, subject, body })}
      replyMessage={(id, body) => adminReplyMessage(id, body)}
      deleteMessage={adminDeleteMessage}
    />
  );
}
