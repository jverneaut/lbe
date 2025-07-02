import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const { admin, payload, shop } = await authenticate.webhook(request);

  console.log({
    admin,
    payload,
    shop,
  });

  const response = await admin.graphql(
   `#graphql
    mutation createProduct($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product {
          id
          title
          handle
          status
          variants(first: 10) {
            edges {
              node {
                id
                price
                barcode
                createdAt
              }
            }
          }
        }
      }
    }
   `,
    {
      variables: {
        product: {
          title: `TEST Product creation`,
        },
      },
    },
  );

  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;

  console.log({
    product,
    variantId,
  });

  console.log('Product created!');

  return new Response();
}
