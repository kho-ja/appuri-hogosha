import admin from "firebase-admin";
import { Telegraf, Markup } from "telegraf";
import { config } from "dotenv";
import DatabaseClient from "./db-client";
config();

// Initialize Firebase Admin SDK once during cold start
const serviceAccount = require("./service.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const messaging = admin.messaging();

// Initialize Telegram bot once
const bot = new Telegraf(process.env.BOT_TOKEN!);

// Get DB instance (only created once)
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

// Process notifications in parallel for better efficiency
const sendNotifications = async (posts: any[]) => {
    if (!posts.length) return [];

    const notificationPromises = posts.map(async (post) => {
        try {
            let isPush = false;

            // Telegram notification (if chat_id exists)
            if (post.chat_id) {
                try {
                    let text = '', buttonText = '';
                    if (post.language === 'jp') {
                        text = '新しい投稿: ' + post.title + ' に ' + post.family_name;
                        buttonText = '見る';
                    } else if (post.language === 'ru') {
                        text = 'Новый пост: ' + post.title + ' для ' + post.family_name;
                        buttonText = 'Посмотреть';
                    } else {
                        text = 'Yangi post: ' + post.title + ' uchun ' + post.family_name;
                        buttonText = 'Ko\'rish';
                    }

                    const button = Markup.inlineKeyboard([
                        Markup.button.url(buttonText, "https://appuri-hogosha.vercel.app/parentnotification")
                    ]);

                    await bot.telegram.sendMessage(post.chat_id, text, button)
                        isPush = true;
                } catch (e) {
                    console.log(`Telegram error for post ${post.id}:`, e);
                }
            }

            // SMS notification (if needed and phone number is valid)
            if (post.sms && post.phone_number && post.phone_number.length == 12 && post.phone_number.startsWith('998')) {
                try {
                    const phone = post.phone_number;
                    const url = process.env.BROKER_URL + '/broker-api/send';
                    const headers = {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + Buffer.from(process.env.BROKER_AUTH!).toString('base64')
                    };

                    let text = '';
                    if (post.language === 'jp') {
                        text = '新しい投稿: ' + post.title + ' に ' + post.family_name + ' リンク: https://appuri-hogosha.vercel.app/parentnotification';
                    } else if (post.language === 'ru') {
                        text = 'Новый пост: ' + post.title + ' для ' + post.family_name + ' ссылка: https://appuri-hogosha.vercel.app/parentnotification';
                    } else {
                        text = 'Yangi post: ' + post.title + ' uchun ' + post.family_name + ' havola: https://appuri-hogosha.vercel.app/parentnotification';
                    }

                    const data = {
                        "messages": [{
                            "message-id": "JDUParent" + post.id,
                            "sms": {
                                "originator": "JDU",
                                "content": {
                                    "text": text
                                }
                            },
                            "recipient": post.phone_number
                        }]
                    };

                    await fetch(url, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(data),
                    });

                    isPush = true;
                } catch (e) {
                    console.log(`SMS error for post ${post.id}:`, e);
                }
            }

            // Firebase push notification
            try {
                const message = {
                    notification: {
                        title: post.title,
                        body: post.family_name,
                    },
                    data: {
                        title: post.title,
                        body: post.family_name,
                        url: "jduapp://(tabs)/(home)/message/" + post.id,
                    },
                    token: post.arn,
                };

                const response = await messaging.send(message);

                console.log(`Successfully sent message for post ${post.id}`, response);
                return post.id; // Return ID for successful notification
            } catch (error) {
                if (isPush) {
                    // If any channel succeeded, consider it a success
                    return post.id;
                } else {
                    console.log(`Firebase error for post ${post.id}:`, error);
                    return null; // Return null for failed notification
                }
            }
        } catch (error) {
            console.error(`Error processing post ${post.id}:`, error);
            return null;
        }
    });

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);

    // Filter out successful notifications
    return results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .filter(Boolean);
};

// Optimize database update for batch operations
const updateDatabase = async (ids: any[]) => {
    if (!ids.length) return;

    await DB.execute(`UPDATE PostParent SET push = true WHERE id IN (${ids.join(',')});`);
};

// Main notification function with performance optimizations
const pushNotifications = async () => {
    console.time('total-execution');

    try {
        // Fetch smaller batches
        console.time('db-fetch');
        const posts = await fetchPosts();
        console.timeEnd('db-fetch');

        if (!posts.length) {
            console.log("No posts found to process");
            return { message: "no posts found", count: 0 };
        }

        console.log(`Processing ${posts.length} notifications...`);

        // Process notifications in parallel
        console.time('send-notifications');
        const successNotifications = await sendNotifications(posts);
        console.timeEnd('send-notifications');

        // Update database for successful notifications
        if (successNotifications.length) {
            console.time('db-update');
            await updateDatabase(successNotifications);
            console.timeEnd('db-update');
        }

        console.log(`Successfully processed ${successNotifications.length} notifications`);
        return {
            message: "success",
            count: successNotifications.length
        };
    } catch (e) {
        console.error("Error in pushNotifications:", e);
        return { message: "error", error: String(e) };
    } finally {
        console.timeEnd('total-execution');
    }
};

// Optimized Lambda handler
export const handler = async () => {
    console.log("Starting handler");

    try {
        const result = await pushNotifications();
        await DB.closeConnection();
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (e) {
        console.error("Handler error:", e);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "error", error: String(e) })
        };
    }
};