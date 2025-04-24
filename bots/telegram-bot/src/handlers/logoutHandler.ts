import { IBotContext } from '../middlewares/sessionMiddleware';

export const logoutHandler = async (ctx: IBotContext) => {
    try {
        if (!ctx.session.parent_id || ctx.session.parent_id === 0) {
            await ctx.reply('Siz allaqachon tizimdan chiqqansiz. 🔒');
            return;
        }

        ctx.session.parent_id = 0;
        await ctx.save(ctx.session);

        await ctx.reply('Tizimdan chiqdingiz. Qayta kirish uchun kontakt yuboring. 📱');

        await ctx.reply('Iltimos, kontakt maʼlumotlaringizni yuboring:', {
            reply_markup: {
                keyboard: [
                    [
                        {
                            text: '📱 Kontaktni yuborish',
                            request_contact: true,
                        },
                    ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    } catch (error) {
        console.error('Logout xatoligi:', error);
        await ctx.reply('Tizimdan chiqishda xatolik yuz berdi. ❌');
    }
};
