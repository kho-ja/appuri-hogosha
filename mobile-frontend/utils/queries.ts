import { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseMessage, Message, Student } from '@/constants/types';

export const fetchMessagesFromDB = async (
  database: SQLiteDatabase,
  studentID: string,
  offset: number = 0
): Promise<Message[]> => {
  const query =
    'SELECT * FROM message WHERE student_number = ? ORDER BY CASE WHEN came_time IS NULL THEN 1 ELSE 0 END, came_time DESC, sent_time DESC LIMIT 10 OFFSET ?';
  const result = await database.getAllAsync(query, [studentID, offset]);
  return result.map((row: any) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    priority: row.priority,
    group_name: row.group_name,
    edited_at: row.edited_at,
    images: JSON.parse(row.images),
    sent_time: row.sent_time,
    viewed_at: row.read_time,
    read_status: row.read_status,
    came_time: row.came_time,
  }));
};

export const fetchMessageFromDB = async (
  database: SQLiteDatabase,
  messageID: number
): Promise<DatabaseMessage | null> => {
  const query = 'SELECT * FROM message WHERE id = ?';
  const result = await database.getFirstAsync<DatabaseMessage | null>(query, [
    messageID,
  ]);
  if (!result) return null;
  return {
    id: result.id,
    title: result.title,
    content: result.content,
    priority: result.priority,
    group_name: result.group_name,
    edited_at: result.edited_at,
    images: result.images ? JSON.parse(result.images as string) : null,
    sent_time: result.sent_time,
    viewed_at: result.read_time,
    read_status: result.read_status,
    student_number: result.student_number,
    student_id: result.student_id,
    read_time: result.read_time,
    sent_status: result.sent_status,
  };
};

export const saveMessagesToDB = async (
  database: SQLiteDatabase,
  messages: Message[],
  activeStudent: string,
  activeStudentID: number
) => {
  const statement = await database.prepareAsync(
    'INSERT OR REPLACE INTO message (id, student_number, student_id, title, content, priority, group_name, edited_at, images, sent_time, read_status, read_time, sent_status, came_time) VALUES ($id, $student_number, $student_id, $title, $content, $priority, $group_name, $edited_at, $images, $sent_time, $read_status, $read_time, $sent_status, $came_time)'
  );
  try {
    for (const item of messages) {
      const imagesArray = item.images
        ? Array.isArray(item.images)
          ? item.images
          : [item.images]
        : null;
      await statement.executeAsync({
        $id: item.id,
        $student_number: activeStudent,
        $student_id: activeStudentID,
        $title: item.title,
        $content: item.content,
        $priority: item.priority,
        $group_name: item.group_name,
        $edited_at: item.edited_at,
        $images: imagesArray ? JSON.stringify(imagesArray) : null,
        $sent_time: item.sent_time,
        $read_status: item.viewed_at ? 1 : 0,
        $read_time: item.viewed_at,
        $sent_status: item.viewed_at ? 1 : 0,
        $came_time: new Date().toLocaleDateString(),
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await statement.finalizeAsync();
  }
};

export const fetchStudentsFromDB = async (
  database: SQLiteDatabase
): Promise<Student[]> => {
  const result = await database.getAllAsync('SELECT * FROM student');
  return result.map((row: any) => ({
    id: row.id,
    student_number: row.student_number,
    family_name: row.family_name,
    given_name: row.given_name,
    phone_number: row.phone_number,
    email: row.email,
  }));
};

export const fetchReadButNotSentMessages = async (
  database: SQLiteDatabase,
  studentID: string
): Promise<number[]> => {
  const query =
    'SELECT id FROM message WHERE student_number = ? AND read_status = 1 AND sent_status = 0';
  const result = await database.getAllAsync(query, [studentID]);
  return result.map((row: any) => row.id);
};

export const saveMessageToDB = async (
  database: SQLiteDatabase,
  message: Message,
  student_number: string,
  student_id: number
) => {
  const images = message.images
    ? Array.isArray(message.images)
      ? message.images
      : [message.images]
    : null;
  return await database.runAsync(
    'INSERT OR REPLACE INTO message (id, student_number, student_id, title, content, priority, group_name, edited_at, images, sent_time, read_status, read_time, sent_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    message.id,
    student_number,
    student_id,
    message.title,
    message.content,
    message.priority,
    message.group_name,
    message.edited_at,
    images ? JSON.stringify(images) : null,
    message.sent_time,
    message.viewed_at ? 1 : 0,
    message.viewed_at,
    message.viewed_at ? 1 : 0
  );
};
