import { DurableObject } from "cloudflare:workers";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject<Env> {
  /**
   * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
   * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
   *
   * @param ctx - The interface for interacting with Durable Object state
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * The Durable Object exposes an RPC method sayHello which will be invoked when a Durable
   *  Object instance receives a request from a Worker via the same method invocation on the stub
   *
   * @returns The greeting to be sent back to the Worker
   */
  async sayHello(): Promise<string> {
    // 1. Get the current count, defaulting to 0 if it doesn't exist.
    let count = (await this.ctx.storage.get<number>("callCount")) ?? 0;

    // 2. Increment the count.
    count++;

    // 3. Save the new count back to storage in the background.
    this.ctx.waitUntil(this.ctx.storage.put("callCount", count));

    // 4. Return the user-facing message.
    return `This endpoint has been called ${count} time(s).`;
  }
}

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(request, env, ctx): Promise<Response> {

     const url = new URL(request.url);
    const sessionId = url.searchParams.get("id");

    // If no 'id' query parameter is provided, return a 404 error.
    if (!sessionId) {
      return new Response("Not Found: An 'id' query parameter is required.", { status: 404 });
    }

    const id: DurableObjectId = env.MY_DURABLE_OBJECT.idFromName(
      sessionId
    );

    // Create a stub to open a communication channel with the Durable
    // Object instance.
    const stub = env.MY_DURABLE_OBJECT.get(id);

    // Call the `sayHello()` RPC method on the stub to invoke the method on
    // the remote Durable Object instance
    const greeting = await stub.sayHello();

    return new Response(greeting);
  },
} satisfies ExportedHandler<Env>;
