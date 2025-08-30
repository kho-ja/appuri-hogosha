import { languageButton } from '../buttons/languageButton';
import { IBotContext } from '../middlewares/sessionMiddleware';

export async function languageScene(ctx: IBotContext) {
    // ctx.session.scene = '';
    // await ctx.save(ctx.session);
    await ctx.reply(
        '🇷🇺 Выберите язык\n' +
            '🇯🇵 言語を選択してください\n' +
            '🇺🇿 Tilni tanlang:\n',
        {
            reply_markup: languageButton,
        }
    );
}
