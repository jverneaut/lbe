import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function action({ request }) {
  const { admin, payload } = await authenticate.webhook(request);
  const { inventory_item_id: inventoryItemId, available } = payload;

  // Step 1: Load variant and product info
  const variantRes = await admin.graphql(
    `#graphql
    query VariantFromInventoryItem($inventoryItemId: ID!) {
      inventoryItem(id: $inventoryItemId) {
        variant {
          id
          inventoryPolicy
          metafield(namespace: "custom", key: "shipping_delay") {
            value
          }
          product {
            id
            metafield(namespace: "custom", key: "shipping_delay") {
              value
            }
          }
        }
      }
    }
    `,
    {
      variables: {
        inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
      },
    },
  );

  const json = await variantRes.json();
  console.dir(json, { depth: null });

  const variant = variantRes.data?.inventoryItem?.variant;
  if (!variant?.id || !variant.inventoryPolicy || !variant.product?.id) {
    console.warn(
      "❌ Could not resolve variant, inventory policy, or product ID",
    );

    return new Response("Invalid variant data", { status: 200 });
  }

  const variantId = variant.id;
  const inventoryPolicy = variant.inventoryPolicy;
  const variantDelay = variant.metafield?.value;
  const productDelay = variant.product.metafield?.value;
  const shippingDelay = variantDelay || productDelay;

  // Step 2: Validate conditions
  const isOutOfStock = available <= 0;
  const isBackorderable = inventoryPolicy === "CONTINUE";

  if (!isBackorderable || !shippingDelay) {
    console.log("Not backorderable or no shipping delay set. Skipping.");
    return new Response("No action needed", { status: 200 });
  }

  // Step 3: Check mapped shipping profile
  const profileMapping = await prisma.shippingDelayProfile.findUnique({
    where: { delayValue: shippingDelay },
  });

  if (!profileMapping) {
    console.warn(`⚠️ No profile mapping for delay value '${shippingDelay}'`);
    return new Response("No matching profile found", { status: 200 });
  }

  const profileId = profileMapping.profileId;

  // Step 4: Assign or remove from shipping profile
  const graphqlMutation = isOutOfStock
    ? `#graphql
      mutation assignToProfile($id: ID!, $variants: [ID!]!) {
        deliveryProfileUpdate(id: $id, profile: {
          variantsToAssociate: $variants
        }) {
          profile { id }
          userErrors { message }
        }
      }`
    : `#graphql
      mutation unassignFromProfile($id: ID!, $variants: [ID!]!) {
        deliveryProfileUpdate(id: $id, profile: {
          variantsToDisassociate: $variants
        }) {
          profile { id }
          userErrors { message }
        }
      }`;

  const mutationRes = await admin.graphql(graphqlMutation, {
    variables: {
      id: profileId,
      variants: [variantId],
    },
  });

  const errors = mutationRes.data?.deliveryProfileUpdate?.userErrors || [];
  if (errors.length) {
    console.warn("⚠️ Shipping profile update errors:", errors);
    return new Response("Profile update failed", { status: 500 });
  }

  console.log(
    isOutOfStock
      ? `✅ Assigned ${variantId} to ${profileId}`
      : `🧹 Removed ${variantId} from ${profileId}`,
  );

  return new Response();
}
