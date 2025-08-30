class SceneMiddleware {
    private scenes: { [key: string]: (ctx: any) => Promise<void> };

    constructor() {
        this.scenes = {};
    }

    addScene(name: string, handler: (ctx: any) => Promise<void>) {
        this.scenes[name] = handler;
    }

    async handle(ctx: any, sceneName: string) {
        const handler = this.scenes[sceneName];
        try {
            if (handler) {
                await handler(ctx);
            }
        } catch (error) {
            console.error('scene handler error: ', error);
        }
    }
}

const sceneHandler = new SceneMiddleware();
export { sceneHandler };
