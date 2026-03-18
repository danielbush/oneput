// A class that has .create() and .createNull() but has CREATE_BOUNDARY_RULE
// violations: it calls DatabaseClient.create() inside an instance method
// instead of in the static .create().

interface QueryResult {
  rows: Array<Record<string, unknown>>;
  count: number;
}

class DatabaseClient {
  static create(connectionString: string) {
    return new DatabaseClient(connectionString, false);
  }

  static createNull(responses: { query?: QueryResult } = {}) {
    const client = new DatabaseClient('null://', true);
    client._nullResponse = responses.query ?? { rows: [], count: 0 };
    return client;
  }

  private _nullResponse?: QueryResult;

  constructor(
    private connectionString: string,
    private isNull: boolean,
  ) {}

  async query(sql: string): Promise<QueryResult> {
    if (this.isNull) {
      return this._nullResponse!;
    }
    // real database call would go here
    throw new Error('Not implemented for this example');
  }
}

export class UserRepository {
  private cache: Map<string, unknown> = new Map();

  static create() {
    // Good: creates the primary dependency here
    const mainDb = DatabaseClient.create('postgres://main-db:5432/app');
    return new UserRepository(mainDb);
  }

  static createNull(config: { queryResult?: QueryResult } = {}) {
    const mainDb = DatabaseClient.createNull({ query: config.queryResult });
    return new UserRepository(mainDb);
  }

  constructor(private db: DatabaseClient) {}

  async findUser(id: string) {
    return this.db.query(`SELECT * FROM users WHERE id = '${id}'`);
  }

  async runMigration() {
    // CREATE_BOUNDARY_RULE violation: creates a dependency inside an instance method
    const migrationDb = DatabaseClient.create(
      'postgres://main-db:5432/app_migrations',
    );
    await migrationDb.query('RUN MIGRATIONS');
  }

  async syncToAnalytics(userId: string) {
    // CREATE_BOUNDARY_RULE violation: creates a dependency inside an instance method
    const analyticsDb = DatabaseClient.create(
      'postgres://analytics-db:5432/warehouse',
    );
    const userData = await this.db.query(
      `SELECT * FROM users WHERE id = '${userId}'`,
    );
    await analyticsDb.query(`INSERT INTO user_events VALUES (...)`);
  }
}
