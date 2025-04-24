import {IBotContext} from '../middlewares/sessionMiddleware';
import {menuButton} from "../buttons/menuButton";
import {loginTypeButton} from "../buttons/loginTypeButton";

export const menuHandler = async (ctx: IBotContext) => {
    // ctx.session.scene = '';
    // await ctx.save(ctx.session);
    const isLoggedIn = !!ctx.session.parent_id; 

    if (ctx.session.parent_id !== 0) {
        let text;
        if (ctx.session.language === 'jp') {
            text = 'これから通知を受け取ることができます';
        } else if (ctx.session.language === 'ru') {
            text = 'Теперь вы можете получать уведомления';
        } else {
            text = 'Endi siz xabarlarni olasiz';
        }
        await ctx.reply(text, {reply_markup: menuButton(ctx.session.language, isLoggedIn)});
    } else {
        await sendLogin(ctx);
    }
};


const sendLogin = async (ctx: IBotContext) => {
    let text;
    if (ctx.session.language === 'jp') {
        text = 'ログイン方法を選択してください';
    } else if (ctx.session.language === 'ru') {
        text = 'Выберите способ входа';
    } else {
        text = 'Kirish usulini tanlang';
    }
    await ctx.reply(text, { reply_markup: loginTypeButton(ctx.session.language) });
};
