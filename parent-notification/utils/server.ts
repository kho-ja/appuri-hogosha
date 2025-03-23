import * as SQLite from 'expo-sqlite'

export default class Database {
	db: SQLite.SQLiteDatabase

	constructor(db: SQLite.SQLiteDatabase) {
		this.db = db
	}

	async create() {
		const db = await SQLite.openDatabaseAsync('parentnotification')
		await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS student (
          id INTEGER PRIMARY KEY,
          name TEXT,
          surname TEXT,
          email TEXT
      );
      CREATE TABLE IF NOT EXISTS message (
          id INTEGER PRIMARY KEY,
          title TEXT,
          date TEXT,
          content TEXT,
          priority TEXT,
          group_name TEXT,
          image TEXT,
          read_status INTEGER,
          read_time TEXT,
          sent_status INTEGER,
          sent_time TEXT,
          student_id INTEGER,
          FOREIGN KEY (student_id) REFERENCES student (id)
      );
      CREATE TABLE IF NOT EXISTS form (
          id INTEGER PRIMARY KEY,
          reason TEXT,
          chosen_date DATE,
          sent_time DATE,
          sent_status INTEGER,
          message TEXT,
          student_id INTEGER,
          FOREIGN KEY (student_id) REFERENCES student (id)
      );
    `)
		return new Database(db)
	}

	async prepareAsyncQuery(
		query: string,
		paramsArray: { [key: string]: string | number }[]
	) {
		const statement = await this.db.prepareAsync(query)

		try {
			for (const params of paramsArray) {
				await statement.executeAsync(params)
			}
		} catch (error) {
			console.error('Error:', error)
		} finally {
			await statement.finalizeAsync()
		}
	}

	async execAsyncQuery(queries: string): Promise<void> {
		return await this.db.execAsync(queries)
	}

	async runAsyncQuery(
		query: string,
		params: SQLite.SQLiteBindParams
	): Promise<SQLite.SQLiteRunResult> {
		return await this.db.runAsync(query, params)
	}

	async getAllAsyncQuery(
		query: string,
		...params: SQLite.SQLiteVariadicBindParams
	): Promise<any[]> {
		return await this.db.getAllAsync(query)
	}
}
