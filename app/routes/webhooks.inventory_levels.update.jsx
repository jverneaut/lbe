import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const { admin, payload, shop } = await authenticate.webhook(request);

  console.log({
    admin,
    payload,
    shop,
  });

  return new Response();
}
