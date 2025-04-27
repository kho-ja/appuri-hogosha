import { IBotContext } from '../middlewares/sessionMiddleware';

type Language = 'uz' | 'ru' | 'jp';

const messages: Record<
  'alreadyLoggedOut' | 'logoutSuccess' | 'requestContact' | 'error' | 'sendContactButton' | 'logoutErrorLog',
  Record<Language, string>
> = {
  alreadyLoggedOut: {
    uz: 'Siz allaqachon tizimdan chiqqansiz. 🔒',
    ru: 'Вы уже вышли из системы. 🔒',
    jp: 'すでにログアウトしています。🔒',
  },
  logoutSuccess: {
    uz: 'Tizimdan chiqdingiz. Qayta kirish uchun kontakt yuboring. 📱',
    ru: 'Вы вышли из системы. Отправьте контакт для повторного входа. 📱',
    jp: 'ログアウトしました。再度ログインするには連絡先を送信してください。📱',
  },
  requestContact: {
    uz: 'Iltimos, kontakt maʼlumotlaringizni yuboring:',
    ru: 'Пожалуйста, отправьте свою контактную информацию:',
    jp: '連絡先情報を送信してください：',
  },
  error: {
    uz: 'Tizimdan chiqishda xatolik yuz berdi. ❌',
    ru: 'Произошла ошибка при выходе из системы. ❌',
    jp: 'ログアウト中にエラーが発生しました。❌',
  },
  sendContactButton: {
    uz: '📱 Kontaktni yuborish',
    ru: '📱 Отправить контакт',
    jp: '📱 連絡先を送信',
  },
  logoutErrorLog: {
    uz: 'Tizimdan chiqishda xatolik:',
    ru: 'Ошибка при выходе из системы:',
    jp: 'ログアウト中のエラー:',
  },
};

export const logoutHandler = async (ctx: IBotContext) => {
  try {
    const lang = ctx.session.language as Language;

    if (!ctx.session.parent_id || ctx.session.parent_id === 0) {
      await ctx.reply(messages.alreadyLoggedOut[lang]);
      return;
    }

    ctx.session.parent_id = 0;
    await ctx.save(ctx.session);

    await ctx.reply(messages.logoutSuccess[lang]);

    await ctx.reply(messages.requestContact[lang], {
      reply_markup: {
        keyboard: [
          [
            {
              text: messages.sendContactButton[lang],
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  } catch (error) {
    const lang = ctx.session.language as Language;
    console.error(messages.logoutErrorLog[lang], error);
    await ctx.reply(messages.error[lang]);
  }
};
