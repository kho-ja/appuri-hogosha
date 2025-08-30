import { Bot, webhookCallback } from 'grammy';
import dotenv from 'dotenv';
import {
    IBotContext,
    sessionMiddleware,
} from './middlewares/sessionMiddleware';
import { sceneHandler } from './middlewares/sceneMiddleware';
import { startHandler } from './commands/startCommand';
import { languageCallback } from './callbacks/languageCallback';
import { languageScene } from './scenes/languageScene';
import { menuHandler } from './commands/menuCommand';
import { contactHandler } from './handlers/contactHandler';
import { phoneButton } from './buttons/phoneButton';
import { Parent } from './utils/cognito-client';
import DB from './utils/db-client';
import { userNotExist } from './handlers/userNotExist';
import { logoutHandler } from './handlers/logoutHandler';
import { logoutCommand } from './commands/logoutCommand';

dotenv.config();

const bot = new Bot<IBotContext>(process.env.BOT_TOKEN!);

bot.api.setMyCommands([
    { command: 'start', description: 'Start' },
    { command: 'login', description: 'Login' },
    { command: 'logout', description: 'Logout' },
]);

sceneHandler.addScene('languageSelection', languageScene);

bot.use(sessionMiddleware);

bot.command('start', startHandler);
languageCallback(bot);

bot.command('login', menuHandler);
bot.on('message:contact', contactHandler);

bot.command('logout', logoutCommand);

bot.callbackQuery('contact_login', async ctx => {
    let text;
    if (ctx.session.language === 'jp') {
        text = '下のボタンを押して電話番号を送信してください';
    } else if (ctx.session.language === 'ru') {
        text = 'Отправьте свой номер телефона, нажав на кнопку ниже';
    } else {
        text = 'Pastdagi tugmani bosing va telefon raqamingizni yuboring';
    }
    await ctx.deleteMessage();
    await ctx.reply(text, {
        reply_markup: phoneButton(ctx.session.language),
    });
});

bot.callbackQuery('email_password_login', async ctx => {
    let text;
    if (ctx.session.language === 'jp') {
        text =
            '📧メールアドレスとパスワードを送信してください\n\n' +
            '例:user@example.com mypassword123\n\n' +
            '注意:\n' +
            '- メールアドレスとパスワードはスペースで区切ってください。\n' +
            '- メッセージは送信後、自動的に削除されます。\n' +
            '- 正確な情報を入力してください。';
    } else if (ctx.session.language === 'ru') {
        text =
            '📧 Пожалуйста, отправьте свою почту и пароль.\n\n' +
            'Пример: user@example.com mypassword123\n\n' +
            'Примечание:\n' +
            '- Почту и пароль разделяйте пробелом.\n' +
            '- Сообщение будет удалено автоматически после отправки.\n' +
            '- Убедитесь, что вводите правильные данные.';
    } else {
        text =
            '📧Iltimos, pochtangizni va parolingizni yuboring.\n\n' +
            'Misol: user@example.com mypassword123\n\n' +
            'Diqqat:\n' +
            '- Pochta va parolni probel orqali ajrating.\n' +
            "- Xabar yuborilgandan song, avtomatik ravishda o'chiriladi.\n" +
            `'- Ma'lumotlaringiz to'g'ri ekanligiga ishonch hosil qiling.'`;
    }
    await ctx.deleteMessage();
    await ctx.reply(text);
});

const emailPasswordRegex = /^([\w.%+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,})\s(.+)$/;

const logoutRegex = /^🚪 (Logout|ログアウト|Выйти)$/;
bot.hears(logoutRegex, logoutHandler);

bot.hears(emailPasswordRegex, async ctx => {
    const messageText = ctx.message?.text;

    if (!messageText) {
        return;
    }

    const match = messageText.match(emailPasswordRegex);
    if (!match) {
        return;
    }

    const email = match[1];
    const password = match[2];

    try {
        const credentials = await Parent.validateCredentials(email, password);
        if (!credentials) {
            let text = '';
            if (ctx.session.language === 'jp') {
                text = `❌ ログインに失敗しました。\n- メールアドレスまたはパスワードが正しくありません。\n- 再度お試しください。`;
            } else if (ctx.session.language === 'ru') {
                text = `❌ Ошибка входа.\n- Почта или пароль неверны.\n- Пожалуйста, попробуйте еще раз.`;
            } else {
                text = `❌ Kirish xatosi.\n- Elektron pochta yoki parol noto'g'ri.\n- Iltimos, qayta urinib ko'ring.`;
            }
            await ctx.reply(text);
            return;
        }

        const users = await DB.query(
            'SELECT id FROM Parent WHERE email = :email;',
            { email: email }
        );

        if (users.length === 0) {
            await userNotExist(ctx);
        } else {
            ctx.session.parent_id = users[0].id;
            await ctx.save(ctx.session);
            // @ts-ignore
            await ctx.api.deleteMessage(ctx.chat.id, ctx.message?.message_id);
            await menuHandler(ctx);
        }
    } catch (error) {
        console.error('Error while sending email and password:', error);
    }
});

bot.hears(
    ['Tilni o`zgartirish:🇯🇵🇺🇿🇷🇺', 'Изменить язык:🇯🇵🇺🇿🇷🇺', '言語を変更:🇯🇵🇺🇿🇷🇺'],
    async ctx => {
        await languageScene(ctx);
    }
);

// bot.start().then(() => {
//     console.log('Bot is running!');
// }).catch((error) => {
//     console.error('Error while starting the bot:', error);
// });

// exports.handler = async (event: any) => {
//     try {
//         await bot.handleUpdate(JSON.parse(event.body));
//         return {statusCode: 200, body: "OK"};
//     } catch (error) {
//         console.error("Error in bot handler:", error);
//         return {statusCode: 500, body: "Internal Server Error"};
//     }
// };

// export const handler = async (event: any) => {
//     try {
//         console.log(await webhookCallback(bot, JSON.parse(event.body)))
//         console.log(await bot.api.sendMessage(731872751, JSON.stringify(event, null, 2)))
//         return {statusCode: 200, body: "OK"};
//     } catch (error) {
//         console.error("Error in bot handler:", error);
//         return {statusCode: 500, body: "Internal Server Error"};
//     }
// };

export const handler = webhookCallback(bot, 'aws-lambda-async');
