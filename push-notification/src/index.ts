import mysql, {
    Connection,
    RowDataPacket,
    ResultSetHeader,
} from "mysql2/promise";
import admin from "firebase-admin";
import process from "node:process";
import { Telegraf, Markup } from "telegraf";
import { config } from "dotenv";
config();

const serviceAccount = require("./service.json");

// console.log('serviceAccount:', serviceAccount);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

class DatabaseClient {
    private connection: Connection | null = null;

    private async createConnection(): Promise<Connection | undefined> {
        try {
            console.log("Connecting to the database...");
            // console.log('with data:', {
            //     host: process.env.HOST,
            //     port: parseInt(process.env.DB_PORT ?? '3306'),
            //     user: process.env.USER,
            //     password: process.env.PASSWORD,
            //     database: process.env.DATABASE
            // });
            const connection: Connection = await mysql.createConnection({
                host: process.env.HOST,
                port: parseInt(process.env.DB_PORT ?? "3306"),
                user: process.env.USER,
                password: process.env.PASSWORD,
                database: process.env.DATABASE,
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
            // console.log(db.format(query, params));
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

const bot = new Telegraf(process.env.BOT_TOKEN!);

const DB = new DatabaseClient();

const fetchPosts = async () => {
    return await DB.query(
        `SELECT pp.id,
                pa.arn,
                po.title,
                st.family_name,
                pses.chat_id,
                pses.language,
                pa.phone_number,
                po.priority,
                CASE
                    WHEN (po.priority = 'high' AND sc.sms_high = true) OR
                         (po.priority = 'medium' AND sc.sms_medium = true) OR
                         (po.priority = 'low' AND sc.sms_low = true)
                        THEN true
                    ELSE false
                    END AS sms
         FROM PostParent AS pp
                  INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                  INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                  LEFT JOIN Post AS po ON ps.post_id = po.id
                  INNER JOIN Student AS st ON ps.student_id = st.id
                  LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                  INNER JOIN School AS sc ON st.school_id = sc.id
         WHERE pa.arn IS NOT NULL
           AND pp.push = false
           AND pp.viewed_at IS NULL LIMIT 25;`);
};

const sendNotifications = async (posts: any) => {
    const successNotifications: any = [];
    for (const post of posts) {
        let isPush = false;
        const message = {
            data: {
                title: post.title,
                body: post.family_name,
                url: "jduapp://(tabs)/(home)/message/" + post.id,
            },
            token: post.arn,
        };

        if (post.chat_id) {
            let text = '', buttonText = '';
            if (post.language === 'jp') {
                text = '新しい投稿: ' + post.title + ' に ' + post.family_name;
                buttonText = '見る'
            } else if (post.language === 'ru') {
                text = 'Новый пост: ' + post.title + ' для ' + post.family_name;
                buttonText = 'Посмотреть'
            } else {
                text = 'Yangi post: ' + post.title + ' uchun ' + post.family_name;
                buttonText = 'Ko\'rish'
            }

            // const url = `jduapp://(tabs)/(home)/message/${post.id}`;
            // text += `\n\n<a href="youtube.com">${buttonText}</a>`;
            const button = Markup.inlineKeyboard([Markup.button.url(buttonText, "https://parents-monolithic.vercel.app/parentnotification")])
            await bot.telegram.sendMessage(post.chat_id, text, button);

            isPush = true;
        }

        if (post.sms) {

            if (post.phone_number && post.phone_number.length == 12 && post.phone_number.startsWith('998')) {
                const phone = post.phone_number;
                // send sms to broker api using post request with basic auth
                const url = process.env.BROKER_URL + '/broker-api/send';
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(process.env.BROKER_AUTH!).toString('base64')
                }

                let text = ''
                if (post.language === 'jp') {
                    text = '新しい投稿: ' + post.title + ' に ' + post.family_name + ' リンク: https://parents-monolithic.vercel.app/parentnotification';
                } else if (post.language === 'ru') {
                    text = 'Новый пост: ' + post.title + ' для ' + post.family_name + ' ссылка: https://parents-monolithic.vercel.app/parentnotification';
                } else {
                    text = 'Yangi post: ' + post.title + ' uchun ' + post.family_name + ' havola: https://parents-monolithic.vercel.app/parentnotification';
                }


                const data = {
                    "messages": [
                        {
                            "message-id": "JDUParent" + post.id,
                            "sms": {
                                "originator": "JDU",
                                "content": {
                                    "text": text
                                }
                            },
                            "recipient": post.phone_number
                        }
                    ]
                }

                fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(data)
                })

                isPush = true;
            }
        }


        try {
            const response = await messaging.send(message);
            console.log('Successfully sent message:', response);
            successNotifications.push(post.id);
        } catch (error) {
            if (isPush) {
                successNotifications.push(post.id);
            } else {
                if (error == 'messaging/registration-token-not-registered') {
                    console.log('invalid token');
                } else {
                    console.log('Error sending message:', error);
                }
            }
        }
    }
    return successNotifications;
}

const updateDatabase = async (ids: any) => {
    if (ids.length > 0) {
        const idsString = ids.join(", ");
        await DB.execute(`
            UPDATE PostParent
            SET push = true
            WHERE id IN (${idsString});
        `);
    }
};

const pushNotifications = async () => {
    try {
        console.log("scanning database...");
        const posts = await fetchPosts();

        if (posts.length > 0) {
            const successNotifications = await sendNotifications(posts);
            console.log('successNotifications:', successNotifications);
            await updateDatabase(successNotifications);

            console.log("sent count:", successNotifications.length);
            return {
                message: "sent count: " + successNotifications.length,
            };
        } else {
            console.log("not found!!!!!");
            return {
                message: "no posts found.",
            };
        }
    } catch (e) {
        console.log("error:", e);
        return {
            message: "error",
        };
    }
};

pushNotifications()


export const handler = async (event: any, context: any) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log("start handeler");
    try {
        await pushNotifications();
        return {
            message: "success",
        };
    } catch (e) {
        console.log("error:", e);
        return {
            message: "error",
        };
    }
};
