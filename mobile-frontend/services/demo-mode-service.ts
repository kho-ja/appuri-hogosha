import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEMO_CREDENTIALS,
  DEMO_OTP_CREDENTIALS,
  DEMO_USER,
  DEMO_STUDENTS,
  DEMO_MESSAGES,
} from '@/constants/demoData';
import { Student, Message, DatabaseMessage, User } from '@/constants/types';

class DemoModeService {
  private static instance: DemoModeService;
  private isDemoMode = false;
  private demoData: Map<string, any> = new Map();

  static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService();
    }
    return DemoModeService.instance;
  }

  /**
   * Check if credentials are demo credentials
   */
  isDemoCredentials(phoneNumber: string, password: string): boolean {
    return (
      phoneNumber === DEMO_CREDENTIALS.phoneNumber &&
      password === DEMO_CREDENTIALS.password
    );
  }

  /**
   * Check if OTP credentials are demo OTP credentials
   */
  isDemoOtpCredentials(phoneNumber: string, otp: string): boolean {
    return (
      phoneNumber === DEMO_OTP_CREDENTIALS.phoneNumber &&
      otp === DEMO_OTP_CREDENTIALS.otp
    );
  }

  /**
   * Check if phone number participates in demo OTP flow
   */
  isDemoOtpPhone(phoneNumber: string): boolean {
    return phoneNumber === DEMO_OTP_CREDENTIALS.phoneNumber;
  }

  /**
   * Enable demo mode and initialize demo data
   */
  async enableDemoMode(): Promise<void> {
    this.isDemoMode = true;

    // Store demo mode flag
    await AsyncStorage.setItem('demo_mode_enabled', 'true');
    this.demoData.set('demo_mode_active', true);

    // Initialize demo data in storage
    await this.initializeDemoData();

    console.log('[DemoMode] Demo mode enabled with sample data');
  }

  /**
   * Disable demo mode and clear demo data
   */
  async disableDemoMode(): Promise<void> {
    this.isDemoMode = false;

    // Clear demo mode flag
    await AsyncStorage.removeItem('demo_mode_enabled');
    this.demoData.delete('demo_mode_active');

    // Clear demo data
    await this.clearDemoData();

    console.log('[DemoMode] Demo mode disabled and data cleared');
  }

  /**
   * Check if demo mode is currently active
   */
  async isDemoModeActive(): Promise<boolean> {
    if (this.isDemoMode) return true;

    // Check persistent storage
    const storedFlag = await AsyncStorage.getItem('demo_mode_enabled');
    const memoryFlag = this.demoData.get('demo_mode_active');

    this.isDemoMode = storedFlag === 'true' || memoryFlag === true;
    return this.isDemoMode;
  }

  /**
   * Initialize demo data in storage
   */
  private async initializeDemoData(): Promise<void> {
    try {
      // Store demo user data
      this.demoData.set('demo_user', JSON.stringify(DEMO_USER));

      // Store demo students data
      this.demoData.set('demo_students', JSON.stringify(DEMO_STUDENTS));

      // Store demo messages for each student
      for (const student of DEMO_STUDENTS) {
        const studentId = student.id;
        const messages = DEMO_MESSAGES[studentId] || [];
        this.demoData.set(
          `demo_messages_${studentId}`,
          JSON.stringify(messages)
        );

        // Store unread count for each student
        this.demoData.set(`demo_unread_${student.id}`, student.unread_count);
      }

      console.log('[DemoMode] Demo data initialized successfully');
    } catch (error) {
      console.error('[DemoMode] Failed to initialize demo data:', error);
    }
  }

  /**
   * Clear all demo data from storage
   */
  private async clearDemoData(): Promise<void> {
    try {
      // Clear demo user data
      this.demoData.delete('demo_user');

      // Clear demo students data
      this.demoData.delete('demo_students');

      // Clear demo messages for each student
      for (const student of DEMO_STUDENTS) {
        this.demoData.delete(`demo_messages_${student.id}`);
        this.demoData.delete(`demo_unread_${student.id}`);
      }

      console.log('[DemoMode] Demo data cleared successfully');
    } catch (error) {
      console.error('[DemoMode] Failed to clear demo data:', error);
    }
  }

  /**
   * Get demo user data
   */
  getDemoUser(): User | null {
    if (!this.isDemoMode) return null;

    try {
      const userData = this.demoData.get('demo_user');
      if (userData) {
        return JSON.parse(userData);
      }
      return DEMO_USER;
    } catch (error) {
      console.error('[DemoMode] Failed to get demo user:', error);
      return DEMO_USER;
    }
  }

  /**
   * Get demo students data
   */
  getDemoStudents(): Student[] {
    if (!this.isDemoMode) return [];

    try {
      const studentsData = this.demoData.get('demo_students');
      if (studentsData) {
        return JSON.parse(studentsData);
      }
      return DEMO_STUDENTS;
    } catch (error) {
      console.error('[DemoMode] Failed to get demo students:', error);
      return DEMO_STUDENTS;
    }
  }

  /**
   * Get demo messages for a specific student
   */
  getDemoMessages(
    studentId: number,
    offset: number = 0,
    limit: number = 10
  ): Message[] {
    if (!this.isDemoMode) return [];

    try {
      const messagesData = this.demoData.get(`demo_messages_${studentId}`);
      let messages: Message[] = [];

      if (messagesData) {
        messages = JSON.parse(messagesData);
      } else {
        // Fallback to getting messages from demo data
        messages = DEMO_MESSAGES[studentId] || [];
      }

      // Apply pagination
      const startIndex = offset;
      const endIndex = offset + limit;
      return messages.slice(startIndex, endIndex);
    } catch (error) {
      console.error('[DemoMode] Failed to get demo messages:', error);
      return [];
    }
  }

  /**
   * Get a specific demo message
   */
  getDemoMessage(studentId: number, messageId: number): DatabaseMessage | null {
    if (!this.isDemoMode) return null;

    try {
      const messages = this.getDemoMessages(studentId, 0, 1000); // Get all messages

      const message = messages.find(m => m.id === messageId);

      if (message) {
        // Convert to DatabaseMessage format
        const student = this.getDemoStudents().find(s => s.id === studentId);
        if (student) {
          const result = {
            ...message,
            student_id: studentId,
            student_number: student.student_number,
          } as DatabaseMessage;
          return result;
        }
      }

      return null;
    } catch (error) {
      console.error('[DemoMode] Failed to get demo message:', error);
      return null;
    }
  }

  /**
   * Mark a demo message as read
   */
  markDemoMessageAsRead(studentId: number, messageId: number): void {
    if (!this.isDemoMode) return;

    try {
      const messagesData = this.demoData.get(`demo_messages_${studentId}`);
      if (messagesData) {
        const messages: Message[] = JSON.parse(messagesData);
        const messageIndex = messages.findIndex(m => m.id === messageId);

        if (messageIndex >= 0 && messages[messageIndex].read_status === 0) {
          messages[messageIndex].read_status = 1;
          messages[messageIndex].viewed_at = new Date().toISOString();
          this.demoData.set(
            `demo_messages_${studentId}`,
            JSON.stringify(messages)
          );

          // Decrease unread count
          const currentUnread =
            this.demoData.get(`demo_unread_${studentId}`) || 0;
          if (currentUnread > 0) {
            this.demoData.set(`demo_unread_${studentId}`, currentUnread - 1);
          }
        }
      }
    } catch (error) {
      console.error('[DemoMode] Failed to mark demo message as read:', error);
    }
  }

  /**
   * Get unread count for a student
   */
  getDemoUnreadCount(studentId: number): number {
    if (!this.isDemoMode) return 0;

    try {
      return this.demoData.get(`demo_unread_${studentId}`) || 0;
    } catch (error) {
      console.error('[DemoMode] Failed to get demo unread count:', error);
      return 0;
    }
  }

  /**
   * Simulate network delay for realistic demo experience
   */
  async simulateNetworkDelay(
    min: number = 300,
    max: number = 800
  ): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get demo login session data
   */
  getDemoSessionData() {
    return {
      access_token: 'demo_access_token_' + Date.now(),
      refresh_token: 'demo_refresh_token_' + Date.now(),
      user: this.getDemoUser() || DEMO_USER,
      school_name: 'Demo Elementary School',
    };
  }
}

export default DemoModeService.getInstance();
