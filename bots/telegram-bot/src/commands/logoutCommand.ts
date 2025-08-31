import { IBotContext } from '../middlewares/sessionMiddleware';
import { logoutHandler } from '../handlers/logoutHandler';

export const logoutCommand = async (ctx: IBotContext) => {
    await logoutHandler(ctx);
};
