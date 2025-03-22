import {Telegraf} from "telegraf";
import dotenv from 'dotenv';
import {IBotContext, Language, sessionMiddleware} from "./sessionHandler";
import {languageButton} from "./buttons/language.button";
import {phoneButton} from "./buttons/phone.button";
import DB from './utils/db-client';
import {removeButton} from "./buttons/remove.button";
import {menuButton} from "./buttons/menu.button";

dotenv.config();

const bot: Telegraf<IBotContext> = new Telegraf<IBotContext>(process.env.BOT_TOKEN!);
bot.use(sessionMiddleware)

async function menu(ctx: IBotContext) {
    if (ctx.session.parent_id !== 0) {
        let text;
        if (ctx.session.language === 'jp') {
            text = 'これから通知を受け取ることができます';
        } else if (ctx.session.language === 'ru') {
            text = 'Теперь вы можете получать уведомления';
        } else {
            text = 'Endi siz xabarlarni olasiz';
        }
        await ctx.reply(text, menuButton(ctx.session.language as Language));
    } else {
        await sendPhone(ctx);
    }
}

async function sendPhone(ctx: IBotContext) {
    let text;
    if (ctx.session.language === 'jp') {
        text = '下のボタンを押して電話番号を送信してください';
    } else if (ctx.session.language === 'ru') {
        text = 'Отправьте свой номер телефона, нажав на кнопку ниже';
    } else {
        text = 'Pastdagi tugmani bosing va telefon raqamingizni yuboring';
    }
    await ctx.reply(text, phoneButton(ctx.session.language as Language));
}

async function userNotExist(ctx: IBotContext) {
    let text;
    if (ctx.session.language === 'jp') {
        text = 'ユーザーが存在しません';
    } else if (ctx.session.language === 'ru') {
        text = 'User Not exists';
    } else {
        text = 'Foydalanuvchi mavjud emas';
    }
    await ctx.reply(text, removeButton);
}

// Special commands
bot.command('start', async (ctx) => {
    const text =
        "🇷🇺 Выберите язык\n" +
        "🇯🇵 言語を選択してください\n" +
        "🇺🇿 Tilni tanlang:\n";
    console.log(ctx.session);
    await ctx.reply(text, languageButton);
});
bot.command('menu', async (ctx) => {
    await ctx.deleteMessage()
    await menu(ctx);
});
bot.on('contact', async (ctx) => {
    try {
        if (ctx.session.parent_id !== 0) {
            await menu(ctx)
        } else {
            let phone = ctx.message.contact.phone_number;
            phone = phone.startsWith('+') ? phone.slice(1) : phone;
            const users = await DB.query('SELECT id FROM Parent WHERE phone_number = :phone_number;', {
                phone_number: phone
            });
            if (users.length === 0) {
                await userNotExist(ctx);
            } else {
                await ctx.saveSession({parent_id: users[0].id});
                ctx.session.parent_id = users[0].id;
                await menu(ctx);
            }

        }
    } catch (e) {
        console.error('Error in contact:', e);
    }
});

// Language
{
    bot.action('set_lang_ru', async (ctx) => {
        await ctx.saveSession({language: 'ru'});
        await ctx.editMessageText('Вы выбрали русский язык');
        await menu(ctx);
    })

    bot.action('set_lang_jp', async (ctx) => {
        await ctx.saveSession({language: 'jp'});
        await ctx.editMessageText('日本語を選択しました');
        await menu(ctx);
    })

    bot.action('set_lang_uz', async (ctx) => {
        await ctx.saveSession({language: 'uz'});
        await ctx.editMessageText('O`zbek tili tanlandi');
        await menu(ctx);
    })
}


// bot.launch({
//     webhook: {
//         domain: process.env.WEBHOOK_URL!,
//         port: Number(process.env.WEBHOOK_PORT!)
//     }
// }).then(() => {
//     console.log('Bot started...');
// }).catch((e) => {
//     console.error('Error in bot launch:', e);
// });
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));

exports.handler = async (event: any) => {
    try {
        await bot.handleUpdate(JSON.parse(event.body));
        return {statusCode: 200, body: "OK"};
    } catch (error) {
        console.error("Error in bot handler:", error);
        return {statusCode: 500, body: "Internal Server Error"};
    }
};
