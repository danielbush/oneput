// A well-structured class that already follows the nullables pattern.
// The skill should recognize this and report compliance with no issues.

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

interface SendResult {
  messageId: string;
  timestamp: Date;
}

// --- INFRASTRUCTURE_WRAPPER (leaf) ---

class StubbedTransport {
  private response: SendResult;

  constructor(response: SendResult) {
    this.response = response;
  }

  async send(_message: EmailMessage): Promise<SendResult> {
    return this.response;
  }
}

interface EmailTransport {
  send(message: EmailMessage): Promise<SendResult>;
}

class EmailClient {
  static create() {
    // Real SMTP transport would go here
    const transport: EmailTransport = {
      async send(message: EmailMessage) {
        // actual SMTP call
        return { messageId: 'real-id', timestamp: new Date() };
      },
    };
    return new EmailClient(transport);
  }

  static createNull(config: { sendResult?: SendResult } = {}) {
    const defaultResult: SendResult = {
      messageId: 'null-id',
      timestamp: new Date('2024-01-01'),
    };
    const transport = new StubbedTransport(config.sendResult ?? defaultResult);
    return new EmailClient(transport);
  }

  private sentEmails: EmailMessage[] = [];

  constructor(private transport: EmailTransport) {}

  async send(message: EmailMessage): Promise<SendResult> {
    this.sentEmails.push(message);
    return this.transport.send(message);
  }

  trackSentEmails() {
    return {
      get data() {
        return [...this.sentEmails];
      },
    };
  }
}

// --- NULLABLE_CLASS (orchestrator) ---

export class NotificationService {
  static create() {
    const emailClient = EmailClient.create();
    return new NotificationService(emailClient);
  }

  static createNull(config: { sendResult?: SendResult } = {}) {
    const emailClient = EmailClient.createNull({
      sendResult: config.sendResult,
    });
    return new NotificationService(emailClient);
  }

  constructor(private emailClient: EmailClient) {}

  async notifyUser(userId: string, event: string): Promise<SendResult> {
    const message: EmailMessage = {
      to: `${userId}@example.com`,
      subject: `Notification: ${event}`,
      body: `You have a new event: ${event}`,
    };
    return this.emailClient.send(message);
  }
}
