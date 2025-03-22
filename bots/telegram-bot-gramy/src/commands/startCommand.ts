import {IBotContext} from '../middlewares/sessionMiddleware';
import {sceneHandler} from '../middlewares/sceneMiddleware';

export const startHandler = async (ctx: IBotContext) => {
    // ctx.session.scene = 'languageSelection';
    // await ctx.save(ctx.session);

    await sceneHandler.handle(ctx, 'languageSelection');
};
