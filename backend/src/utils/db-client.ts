import mysql, {
    Connection,
    RowDataPacket,
    ResultSetHeader,
} from 'mysql2/promise';
import process from 'node:process';

class DatabaseClient {
    private connection: Connection | null = null;

    private async createConnection(): Promise<Connection | undefined> {
        try {
            const connection: Connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                pool: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
            });
            console.log('Connected to the database successfully.');
            return connection;
        } catch (e: any) {
            console.log('Database connection error:', e);
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
            console.log('error in getConnection()', e);
        }
    }

    public async query(
        query: string,
        params?: any
    ): Promise<RowDataPacket[] | RowDataPacket[][] | ResultSetHeader | any> {
        // Add query validation to prevent dangerous queries
        const dangerousPatterns = [
            /;\s*(drop|delete|truncate|alter|create|insert|update)\s+/i,
            /union\s+select/i,
            /information_schema/i,
            /mysql\./i,
            /--/,
            /\/\*/,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(query)) {
                console.error('Potentially dangerous query detected:', query);
                throw new Error(
                    'Query contains potentially dangerous patterns'
                );
            }
        }

        const db = (await this.getConnection()) as Connection;
        // console.log(db.format(query, params))
        try {
            const [results] = await db.query(query, params);
            return results;
        } catch (e: any) {
            console.log('error in query', e);
            throw e;
        }
    }

    public async execute(
        query: string,
        params?: any
    ): Promise<ResultSetHeader> {
        const db = (await this.getConnection()) as Connection;
        // console.log(db.format(query, params))
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
            console.log('Database connection closed');
            this.connection = null;
        }
    }
}

export default new DatabaseClient();
