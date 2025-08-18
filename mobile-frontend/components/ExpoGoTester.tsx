import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSQLiteContext } from 'expo-sqlite';
import Constants from 'expo-constants';

export default function ExpoGoTester() {
  const [messageId, setMessageId] = useState('123');
  const [studentId, setStudentId] = useState('10');
  const [ipAddress, setIpAddress] = useState('10.20.0.42');
  const [linkType, setLinkType] = useState<
    'message' | 'student' | 'home' | 'settings'
  >('message');
  const db = useSQLiteContext();

  // Определяем правильную схему в зависимости от режима сборки
  const getCustomScheme = () => {
    // В development mode используем expo схему
    if (__DEV__) {
      return Constants.expoConfig?.scheme || 'jduapp-dev';
    }

    // Для production сборки
    const variant = process.env.APP_VARIANT || 'production';
    switch (variant) {
      case 'development':
        return 'jduapp-dev';
      case 'preview':
        return 'jduapp-preview';
      case 'production':
        return 'jduapp';
      default:
        return 'jduapp-dev';
    }
  };

  const loadRandomStudentId = async () => {
    try {
      const allStudents = await db.getAllAsync<{
        id: number;
        given_name: string;
        family_name: string;
      }>(
        'SELECT id, given_name, family_name FROM student ORDER BY id DESC LIMIT 10'
      );

      if (allStudents && allStudents.length > 0) {
        const studentList = allStudents
          .map(
            student =>
              `ID: ${student.id} - ${student.given_name} ${student.family_name}`
          )
          .join('\n');

        // Используем первого студента
        setStudentId(allStudents[0].id.toString());

        Alert.alert(
          'Доступные студенты',
          `Найдено ${allStudents.length} студентов:\n\n${studentList}\n\nИспользуется ID: ${allStudents[0].id}`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Ошибка',
        'Студенты не найдены в базе данных. Сначала войдите в приложение.'
      );
    } catch (error) {
      console.error('Error loading student ID:', error);
      Alert.alert('Ошибка', `Не удалось загрузить данные студентов: ${error}`);
    }
  };

  const loadRandomMessageId = async () => {
    try {
      // Сначала покажем все доступные ID
      const allMessages = await db.getAllAsync<{ id: number; title: string }>(
        'SELECT id, title FROM message ORDER BY id DESC LIMIT 10'
      );

      if (allMessages && allMessages.length > 0) {
        const messageList = allMessages
          .map(msg => `ID: ${msg.id} - ${msg.title}`)
          .join('\n');

        // Используем первое сообщение
        setMessageId(allMessages[0].id.toString());

        Alert.alert(
          'Доступные сообщения',
          `Найдено ${allMessages.length} сообщений:\n\n${messageList}\n\nИспользуется ID: ${allMessages[0].id}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Если локальных сообщений нет, проверим студентов
      const students = await db.getAllAsync<{ id: number; given_name: string }>(
        'SELECT id, given_name FROM student LIMIT 5'
      );

      if (students && students.length > 0) {
        const studentList = students
          .map(s => `ID: ${s.id} - ${s.given_name}`)
          .join('\n');
        Alert.alert(
          'Нужно загрузить сообщения',
          `Найдены студенты:\n${studentList}\n\n1. Перейдите в список сообщений\n2. Выберите студента\n3. Потяните вниз для обновления\n4. Вернитесь сюда`
        );
      } else {
        Alert.alert(
          'Ошибка',
          'Нет данных в базе. Сначала войдите в приложение и загрузите данные.'
        );
      }
    } catch (error) {
      console.error('Error loading message ID:', error);
      Alert.alert('Ошибка', `Не удалось загрузить данные: ${error}`);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const messageCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM message'
      );
      const studentCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM student'
      );

      const recentMessages = await db.getAllAsync<{
        id: number;
        title: string;
        sent_time: string;
      }>(
        'SELECT id, title, sent_time FROM message ORDER BY sent_time DESC LIMIT 5'
      );

      let statusText = `База данных:\n`;
      statusText += `📧 Сообщений: ${messageCount?.count || 0}\n`;
      statusText += `👤 Студентов: ${studentCount?.count || 0}\n\n`;

      if (recentMessages.length > 0) {
        statusText += `Последние сообщения:\n`;
        recentMessages.forEach(msg => {
          statusText += `• ID: ${msg.id} - ${msg.title.substring(0, 30)}...\n`;
        });
      } else {
        statusText += `❌ Нет сообщений в базе данных\n\n`;
        statusText += `Решение:\n`;
        statusText += `1. Откройте приложение\n`;
        statusText += `2. Войдите в аккаунт\n`;
        statusText += `3. Выберите студента\n`;
        statusText += `4. Потяните список вниз для обновления`;
      }

      Alert.alert('Статус базы данных', statusText);
    } catch (error) {
      Alert.alert('Ошибка', `Не удалось проверить базу: ${error}`);
    }
  };

  const showIPInstructions = () => {
    const instructions = `
Как найти ваш IP адрес:

1️⃣ Запустите команду: npx expo start
2️⃣ В терминале найдите строку:
   "Metro waiting on exp://YOUR_IP:8081"
3️⃣ Скопируйте IP адрес и вставьте выше

🔄 Или найдите в разделе "Network" в терминале

⚠️ ВАЖНО:
   • Expo Go должен быть запущен
   • Приложение должно быть активно в Expo Go
   • IP адрес должен быть доступен
    `;

    Alert.alert('Инструкции по тестированию', instructions);
  };

  const generateDeepLinks = () => {
    const msgId = parseInt(messageId) || 123;
    const studId = parseInt(studentId) || 10;
    const customScheme = getCustomScheme();

    if (linkType === 'home') {
      // Ссылки на главную страницу
      return {
        // Альтернативные форматы для Expo Go
        expoGoSimple: `exp://${ipAddress}:8081/--/?page=home`,
        expoGoParams: `exp://${ipAddress}:8081/--/?type=home`,

        // Оригинальные форматы (могут не работать)
        expoGo: `exp://${ipAddress}:8081/--/`,
        expoGoStudentFormat: `exp://${ipAddress}:8081/--/home`,

        // Custom Scheme URLs (автоматически выбирает правильную схему)
        dev: `${customScheme}://`,
        devStudentFormat: `${customScheme}://home`,
      };
    } else if (linkType === 'settings') {
      return {
        // Альтернативные форматы для Expo Go
        expoGoSimple: `exp://${ipAddress}:8081/--/?page=settings`,
        expoGoParams: `exp://${ipAddress}:8081/--/?type=settings`,

        // Оригинальные форматы (могут не работать)
        expoGo: `exp://${ipAddress}:8081/--/settings`,
        expoGoStudentFormat: `exp://${ipAddress}:8081/--/settings`,

        // Custom Scheme URLs
        dev: `${customScheme}://settings`,
        devStudentFormat: `${customScheme}://settings`,
      };
    } else if (linkType === 'student') {
      // Ссылки на страницу студента
      return {
        // Альтернативные форматы для Expo Go
        expoGoSimple: `exp://${ipAddress}:8081/--/?studentPage=${studId}`,
        expoGoParams: `exp://${ipAddress}:8081/--/?type=student&id=${studId}`,

        // Оригинальные форматы (могут не работать)
        expoGo: `exp://${ipAddress}:8081/--/student/${studId}`,
        expoGoStudentFormat: `exp://${ipAddress}:8081/--/student/${studId}`,

        // Custom Scheme URLs
        dev: `${customScheme}://student/${studId}`,
        devStudentFormat: `${customScheme}://student/${studId}`,
      };
    } else {
      // Ссылки на сообщение студента (текущий функционал)
      return {
        // Альтернативные форматы для Expo Go
        expoGoSimple: `exp://${ipAddress}:8081/--/?student=${msgId}`,
        expoGoParams: `exp://${ipAddress}:8081/--/?messageId=${msgId}&studentId=${studId}`,

        // Оригинальные форматы (могут не работать)
        expoGo: `exp://${ipAddress}:8081/--/student/message/${msgId}`,
        expoGoStudentFormat: `exp://${ipAddress}:8081/--/student/${studId}/message/${msgId}`,

        // Custom Scheme URLs
        dev: `${customScheme}://student/message/${msgId}`,
        devStudentFormat: `${customScheme}://student/${studId}/message/${msgId}`,
      };
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Скопировано!', `${label} скопирован в буфер обмена`);
  };

  if (!__DEV__) {
    return null;
  }

  const customScheme = getCustomScheme();
  const links = generateDeepLinks();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 External Deep Link Testing</Text>

      {/* Выбор типа ссылки */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Тип ссылки:</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              linkType === 'home' && styles.toggleButtonActive,
            ]}
            onPress={() => setLinkType('home')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                linkType === 'home' && styles.toggleButtonTextActive,
              ]}
            >
              🏠 Главная
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              linkType === 'settings' && styles.toggleButtonActive,
            ]}
            onPress={() => setLinkType('settings')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                linkType === 'settings' && styles.toggleButtonTextActive,
              ]}
            >
              ⚙️ Настройки
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              linkType === 'message' && styles.toggleButtonActive,
            ]}
            onPress={() => setLinkType('message')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                linkType === 'message' && styles.toggleButtonTextActive,
              ]}
            >
              📧 Сообщение
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              linkType === 'student' && styles.toggleButtonActive,
            ]}
            onPress={() => setLinkType('student')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                linkType === 'student' && styles.toggleButtonTextActive,
              ]}
            >
              👤 Студент
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Поля ввода */}
      {linkType === 'home' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>🏠 Главная страница</Text>
          <Text style={styles.info}>
            Ссылки на главную страницу не требуют дополнительных параметров
          </Text>
        </View>
      )}

      {linkType === 'settings' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>⚙️ Настройки</Text>
          <Text style={styles.info}>
            Ссылки на настройки не требуют дополнительных параметров
          </Text>
        </View>
      )}

      {linkType === 'message' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Message ID:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={messageId}
              onChangeText={setMessageId}
              placeholder='Введите ID сообщения'
              keyboardType='numeric'
            />
            <TouchableOpacity
              style={styles.loadButton}
              onPress={loadRandomMessageId}
            >
              <Text style={styles.loadButtonText}>📂 Загрузить из БД</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.loadButton, { backgroundColor: '#ff9800' }]}
              onPress={checkDatabaseStatus}
            >
              <Text style={styles.loadButtonText}>🔍 Проверить БД</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {linkType === 'student' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Student ID:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={studentId}
              onChangeText={setStudentId}
              placeholder='Введите ID студента'
              keyboardType='numeric'
            />
            <TouchableOpacity
              style={styles.loadButton}
              onPress={loadRandomStudentId}
            >
              <Text style={styles.loadButtonText}>👤 Загрузить из БД</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>IP Address:</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder='Введите IP адрес'
          />
          <TouchableOpacity
            style={styles.helpButton}
            onPress={showIPInstructions}
          >
            <Text style={styles.helpButtonText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.info}>📖 Чтобы получить реальные ID сообщений:</Text>
      <Text style={styles.info}>1️⃣ Перейдите в список сообщений</Text>
      <Text style={styles.info}>
        2️⃣ Нажмите &ldquo;Обновить&rdquo; чтобы загрузить сообщения с сервера
      </Text>
      <Text style={styles.info}>
        3️⃣ Вернитесь сюда и нажмите &ldquo;📂 Загрузить из БД&rdquo;
      </Text>
      <Text style={styles.info}>
        🔍 Найдите в терминале: Metro waiting on exp://YOUR_IP:8081
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          ✅ Упрощенные Expo Go Links (Рекомендуется)
        </Text>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => copyToClipboard(links.expoGoSimple, 'Expo Go Simple')}
        >
          <Text style={styles.linkLabel}>Simple Format (Query Params)</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {links.expoGoSimple}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => copyToClipboard(links.expoGoParams, 'Expo Go Params')}
        >
          <Text style={styles.linkLabel}>With Parameters</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {links.expoGoParams}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          ⚠️ Сложные Expo Go Links (Могут не работать)
        </Text>

        <TouchableOpacity
          style={[styles.linkButton, styles.warningButton]}
          onPress={() => copyToClipboard(links.expoGo, 'Expo Go Full Path')}
        >
          <Text style={styles.linkLabel}>Full Path Format</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {links.expoGo}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, styles.warningButton]}
          onPress={() =>
            copyToClipboard(links.expoGoStudentFormat, 'Expo Go Student Format')
          }
        >
          <Text style={styles.linkLabel}>Student Format</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {links.expoGoStudentFormat}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🔧 Custom Scheme URLs ({customScheme}://)
        </Text>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => copyToClipboard(links.dev, 'Dev URL')}
        >
          <Text style={styles.linkLabel}>Basic Dev Format</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {links.dev}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            copyToClipboard(links.devStudentFormat, 'Dev Student Format')
          }
        >
          <Text style={styles.linkLabel}>Dev Student Format</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {links.devStudentFormat}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.instructionButton}
        onPress={showIPInstructions}
      >
        <Text style={styles.instructionButtonText}>
          📋 Показать полные инструкции
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        💡 Используйте упрощенные форматы для лучшей совместимости с Expo Go
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    margin: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0d47a1',
    textAlign: 'center',
  },
  info: {
    fontSize: 12,
    color: '#1565c0',
    marginBottom: 5,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#0d47a1',
  },
  linkButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  warningButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: '#ff9800',
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d47a1',
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#1565c0',
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 3,
  },
  instructionButton: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  instructionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d47a1',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2196f3',
    borderRadius: 6,
    padding: 8,
    backgroundColor: 'white',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  loadButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  helpButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  helpButtonText: {
    color: 'white',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2196f3',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
});
