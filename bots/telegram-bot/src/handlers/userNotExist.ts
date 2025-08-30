import { IBotContext } from '../middlewares/sessionMiddleware';

export const userNotExist = async (ctx: IBotContext) => {
    let text;
    if (ctx.session.language === 'jp') {
        text = 'ユーザーが存在しません';
    } else if (ctx.session.language === 'ru') {
        text = 'Пользователь не существует';
    } else {
        text = 'Foydalanuvchi mavjud emas';
    }
    await ctx.reply(text, {
        reply_markup: {
            remove_keyboard: true,
        },
    });
};
