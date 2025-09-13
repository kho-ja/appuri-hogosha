import mysql, {
    Connection,
    RowDataPacket,
    ResultSetHeader,
} from 'mysql2/promise';
import process from 'node:process';

class DatabaseClient {
    private connection: Connection | null = null;

    private async createConnection(retry = 0): Promise<Connection | undefined> {
        const maxRetries = 3;
        try {
            const connection: Connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT) || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE,
                multipleStatements: false,
                connectTimeout: 10_000,
            });

            // Enable named placeholders by default
            connection.config.namedPlaceholders = true;

            // Basic keep-alive ping every 55s (do not await so it doesn't block)
            const pingInterval = setInterval(() => {
                // @ts-ignore - using internal connection
                connection.ping().catch(() => {
                    /* swallow */
                });
            }, 55_000);

            // Clear interval on connection end
            connection.on('end', () => clearInterval(pingInterval));
            connection.on('error', err => {
                console.error('MySQL connection error:', err.code);
                if (
                    ['PROTOCOL_CONNECTION_LOST', 'ECONNRESET'].includes(
                        err.code
                    )
                ) {
                    this.connection = null; // force new connection on next query
                }
            });

            console.log('Connected to the database successfully.');
            return connection;
        } catch (e: any) {
            console.log('Database connection error:', e.code || e.message || e);
            if (retry < maxRetries) {
                const backoff = (retry + 1) * 500;
                await new Promise(r => setTimeout(r, backoff));
                return this.createConnection(retry + 1);
            }
        }
    }

    private async getConnection(): Promise<Connection | undefined> {
        try {
            if (!this.connection) {
                this.connection = (await this.createConnection()) as Connection;
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
