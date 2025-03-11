import {InlineKeyboard} from 'grammy';
import {Language} from '../middlewares/sessionMiddleware';

export const loginTypeButton = (lang: Language) => {
    let phone;
    let email;
    if (lang === 'jp') {
        phone = '☎️電話番号';
        email = '📧メールアドレスとパスワード';
    } else if (lang === 'ru') {
        phone = '☎️Телефонный номер';
        email = '📧Почта и пароль';
    } else {
        phone = '☎️Telefon raqam';
        email = '📧Elektron pochta va parol';
    }

    return new InlineKeyboard()
        .text(phone, 'contact_login')
        .text(email, 'email_password_login');
};
