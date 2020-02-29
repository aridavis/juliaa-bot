export class MessageController {
    getUserId(ctx){
        return ctx.message.from.id
    }
}

export default MessageController
