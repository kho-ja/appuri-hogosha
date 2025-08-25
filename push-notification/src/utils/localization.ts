import { NotificationPost } from '../types/events';

export const getLocalizedText = (
    language: string,
    type: 'title' | 'body' | 'sms',
    data: NotificationPost
): string => {
    const studentName = `${data.given_name} ${data.family_name}`;

    const link = `https://appuri-hogosha.vercel.app/parentnotification/student/${data.student_id}/message/${data.id}`;
    const texts = {
        jp: {
            title: `新しい投稿: ${data.title}`,
            body: `${studentName}への新しいメッセージがあります`,
            sms: `新しい投稿: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} ${studentName}宛 リンク: ${link}`,
        },
        ru: {
            title: `Новый пост: ${data.title}`,
            body: `Новое сообщение для ${studentName}`,
            sms: `Новый пост: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} для ${studentName} ссылка: ${link}`,
        },
        uz: {
            title: `Yangi post: ${data.title}`,
            body: `${studentName} uchun yangi xabar`,
            sms: `Yangi post: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} ${studentName} uchun havola: ${link}`,
        },
    };

    return texts[language as keyof typeof texts]?.[type] || texts.uz[type];
};

export const generateSmsText = (post: NotificationPost): string => {
    const link = `https://appuri-hogosha.vercel.app/parentnotification/student/${post.student_id}/message/${post.id}`;
    if (post.language === 'jp') {
        return (
            '新しい投稿: ' +
            post.title +
            ' に ' +
            post.family_name +
            ' リンク: ' +
            link
        );
    } else if (post.language === 'ru') {
        return (
            'Новый пост: ' +
            post.title +
            ' для ' +
            post.family_name +
            ' ссылка: ' +
            link
        );
    } else {
        return (
            'Yangi post: ' +
            post.title +
            ' uchun ' +
            post.family_name +
            ' havola: ' +
            link
        );
    }
};
