import mysql, { Connection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { ENVIRONMENT } from "../../config/environment";

export class DatabaseClient {
    private connection: Connection | null = null;

    private async createConnection(): Promise<Connection | undefined> {
        try {
            console.log("Connecting to the database...");
            const connection: Connection = await mysql.createConnection({
                host: ENVIRONMENT.DB_HOST,
                port: ENVIRONMENT.DB_PORT,
                user: ENVIRONMENT.DB_USER,
                password: ENVIRONMENT.DB_PASSWORD,
                database: ENVIRONMENT.DB_NAME,
            });
            console.log("Connected to the database successfully.");
            return connection;
        } catch (e: any) {
            console.log("Database connection error:", e);
        }
    }

    private async getConnection(): Promise<Connection | undefined> {
        try {
            if (!this.connection) {
                this.connection = (await this.createConnection()) as Connection;
                this.connection.config.namedPlaceholders = true;
            }
            return this.connection;
        } catch (e: any) {
            console.log("error in getConnection()", e);
        }
    }

    public async query(
        query: string,
        params?: any,
    ): Promise<RowDataPacket[] | RowDataPacket[][] | ResultSetHeader | any> {
        const db = (await this.getConnection()) as Connection;
        try {
            const [results] = await db.query(query, params);
            return results;
        } catch (e: any) {
            console.log("error in query", e);
            throw e;
        }
    }

    public async execute(query: string, params?: any): Promise<ResultSetHeader> {
        const db = await this.getConnection() as Connection;
        try {
            const [results] = await db.execute<ResultSetHeader>(query, params);
            return results;
        } catch (e: any) {
            console.error('Error in execute:', e.message);
            throw new Error('Database execute failed');
        }
    }

    public async closeConnection(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            console.log("Database connection closed");
            this.connection = null;
        }
    }
}