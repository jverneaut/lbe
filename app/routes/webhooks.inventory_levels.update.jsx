import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const { admin, payload, shop } = await authenticate.webhook(request);

  console.log({
    admin,
    payload,
    shop,
  });

  console.log('Should work');

  return new Response();
}
