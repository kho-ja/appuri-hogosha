import { Context, MiddlewareFn } from 'grammy';
import DB from '../utils/db-client';

export interface IBotSession {
    scene: string;
    language: Language;
    parent_id: number;
}

export type Language = 'jp' | 'ru' | 'uz' | '';

export interface IBotContext extends Context {
    session: IBotSession;
    save: (session: IBotSession) => Promise<void>;
}

export const sessionMiddleware: MiddlewareFn<IBotContext> = async (
    ctx,
    next
) => {
    const chatId = ctx.chat?.id;
    console.log('chatId:', chatId);
    if (!chatId) {
        return;
    }

    try {
        const result = await DB.query(
            'SELECT scene, language, parent_id FROM ParentSession WHERE chat_id = :chat_id;',
            {
                chat_id: chatId,
            }
        );
        console.log('result:', result);

        ctx.session = result.length
            ? result[0]
            : { scene: '', language: '', parent_id: 0 };

        // Save session after processing
        const saveSession = async (session: IBotSession) => {
            try {
                console.log('session:', session);
                if (session.parent_id > 0) {
                    console.log('update session');
                    const query =
                        'UPDATE ParentSession  SET language = :language, scene = :scene, step = :step, parent_id = :parent_id WHERE chat_id = :chat_id;';
                    await DB.execute(query, {
                        language: session.language,
                        scene: session.scene,
                        step: 0,
                        parent_id: session.parent_id,
                        chat_id: chatId,
                    });
                } else {
                    console.log('insert session');
                    const query = `INSERT INTO ParentSession (chat_id, language, scene, step, parent_id)
                                VALUE (:chat_id, :language, :scene, :step, :parent_id) 
                                ON DUPLICATE KEY UPDATE
                                    language = VALUES(language),
                                    scene = VALUES(scene),
                                    step = VALUES(step),
                                    parent_id = VALUES(parent_id);`;
                    await DB.execute(query, {
                        language: session.language,
                        scene: session.scene,
                        step: 0,
                        parent_id: session.parent_id,
                        chat_id: chatId,
                    });
                }
            } catch (e) {
                console.error('Error in saveSession:', e);
            }
        };

        ctx.save = saveSession;
        await next();
    } catch (error) {
        console.error('Session Middleware Error:', error);
    }
};
