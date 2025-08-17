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
        // Detect potential SQL injection vulnerabilities
        this.validateQuery(query, params);

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

    private validateQuery(query: string, params?: any): void {
        // Check for string interpolation patterns that indicate SQL injection risk
        const injectionPatterns = [
            /\$\{[^}]*\}/, // Template literals like ${variable}
            /VALUES\s+\([^:?$]/i, // VALUES with non-parameterized data
            /\+[^+]*\+/, // String concatenation
            /'\s*\+\s*|'\s*\|\|\s*/, // String concatenation with quotes
        ];

        for (const pattern of injectionPatterns) {
            if (pattern.test(query)) {
                console.error(
                    'Potential SQL injection detected in query:',
                    query
                );
                throw new Error(
                    'Query contains potential SQL injection vulnerability. Use parameterized queries instead.'
                );
            }
        }

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

        // Ensure parameters are provided for parameterized queries
        const hasNamedParams = /:(\w+)/.test(query);
        const hasPositionalParams = /\?/.test(query);

        if ((hasNamedParams || hasPositionalParams) && !params) {
            console.warn(
                'Parameterized query detected but no parameters provided:',
                query
            );
        }
    }

    public async execute(
        query: string,
        params?: any
    ): Promise<ResultSetHeader> {
        // Apply the same validation as query method
        this.validateQuery(query, params);

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

    /**
     * Safely perform bulk insert operations using parameterized queries
     * @param table - Table name to insert into
     * @param columns - Array of column names
     * @param rows - Array of row data (arrays of values)
     * @returns Promise<ResultSetHeader>
     */
    public async bulkInsert(
        table: string,
        columns: string[],
        rows: any[][]
    ): Promise<ResultSetHeader> {
        if (!rows.length) {
            throw new Error('No rows provided for bulk insert');
        }

        // Validate table name (basic protection)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error('Invalid table name');
        }

        // Validate column names
        for (const column of columns) {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
                throw new Error(`Invalid column name: ${column}`);
            }
        }

        const placeholders = rows
            .map(
                (_, index) =>
                    `(${columns.map((_, colIndex) => `:row${index}_col${colIndex}`).join(', ')})`
            )
            .join(', ');

        const params: any = {};
        rows.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                params[`row${rowIndex}_col${colIndex}`] = value;
            });
        });

        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;

        return this.execute(query, params);
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
