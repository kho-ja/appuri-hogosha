import { Bot } from 'grammy';
import { IBotContext } from '../middlewares/sessionMiddleware';
import { menuHandler } from '../commands/menuCommand';

export const languageCallback = (bot: Bot<IBotContext>) => {
    bot.callbackQuery('set_lang_ru', async ctx => {
        ctx.session.language = 'ru';
        // ctx.session.scene = '';
        await ctx.save(ctx.session);

        await ctx.deleteMessage();
        await ctx.reply('Вы выбрали русский язык.');
        await menuHandler(ctx);
    });

    bot.callbackQuery('set_lang_jp', async ctx => {
        ctx.session.language = 'jp';
        // ctx.session.scene = '';
        await ctx.save(ctx.session);

        await ctx.deleteMessage();
        await ctx.reply('日本語を選択しました。');
        await menuHandler(ctx);
    });

    bot.callbackQuery('set_lang_uz', async ctx => {
        ctx.session.language = 'uz';
        // ctx.session.scene = '';
        await ctx.save(ctx.session);

        await ctx.deleteMessage();
        await ctx.reply('Oʻzbek tilini tanladingiz.');
        await menuHandler(ctx);
    });
};
