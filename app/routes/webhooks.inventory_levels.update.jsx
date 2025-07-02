import { authenticate } from "../shopify.server";

export async function action({ request }) {
  const { admin, payload } = await authenticate.webhook(request);

  console.log(payload);

  // TODO:
  // I think we should be very careful about how we handle setting the profile,
  // as it can change between the moment the person added the last item to cart
  // and the moment he goes to checkout.
  // If there is only one item remaining, then he can order it, then the item is
  // out of stock, then the new shipping profile is applied and as such the order
  // will be displayed as shipping later

  // await admin.graphql(
  //   `mutation assignToBackorderProfile($id: ID!, $variants: [ID!]!) {
  //     deliveryProfileUpdate(id: $id, profile: {
  //       variantsToAssociate: $variants
  //     }) {
  //       profile { id }
  //       userErrors { message }
  //     }
  //   }`,
  //   {
  //     variables: {
  //       id: BACKORDER_PROFILE_ID,
  //       variants: [variantId],
  //     },
  //   },
  // );

  // const response = await admin.graphql(
  //   `#graphql
  //   mutation createProduct($product: ProductCreateInput!) {
  //     productCreate(product: $product) {
  //       product {
  //         id
  //         title
  //         handle
  //         status
  //         variants(first: 10) {
  //           edges {
  //             node {
  //               id
  //               price
  //               barcode
  //               createdAt
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  //  `,
  //   {
  //     variables: {
  //       product: {
  //         title: `TEST Product creation`,
  //       },
  //     },
  //   },
  // );

  // const responseJson = await response.json();
  // const product = responseJson.data.productCreate.product;
  // const variantId = product.variants.edges[0].node.id;

  // console.log({
  //   product,
  //   variantId,
  // });

  // console.log("Product created!");

  return new Response();
}
