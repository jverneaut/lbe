import {
  Page,
  Layout,
  Card,
  Select,
  Text,
  Button,
  FormLayout,
  Frame,
} from "@shopify/polaris";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

// TODO:
// 1. Set shipping profiles to the default one automatically when
// they are set as a mapping to a value if possible.
// 2. Find a way to remove old mapping if/when values or profiles are removed

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // For now, hardcoded
  const delayValues = ["1w", "2w", "1m", "2d"];

  const response = await admin.graphql(
    `#graphql
    query MetafieldDefinitions($ownerType: MetafieldOwnerType!, $first: Int) {
      metafieldDefinitions(ownerType: $ownerType, first: $first) {
        nodes {
          name
          namespace
          key
          type {
            name
          }
          validations {
            name
            type
            value
          }
        }
      }
    }`,
    {
      variables: {
        ownerType: "PRODUCT",
        first: 100,
      },
    },
  );

  const data = await response.json();
  console.dir(data, { depth: null });

  const profilesResp = await admin.graphql(`
    {
      deliveryProfiles(first: 100) {
        nodes {
          id
          name
        }
      }
    }
  `);

  const profilesJSON = await profilesResp.json();
  const profiles = profilesJSON.data.deliveryProfiles.nodes;

  const savedMappings = await prisma.shippingDelayProfile.findMany({});

  return json({ delayValues, profiles, savedMappings });
};

export const action = async ({ request }) => {
  const formData = await request.formData();

  const entries = [...formData.entries()];
  for (const [key, profileId] of entries) {
    const delayValue = key;

    if (typeof profileId === "string" && profileId) {
      await prisma.shippingDelayProfile.upsert({
        where: { delayValue },
        update: { profileId },
        create: { delayValue, profileId },
      });
    }
  }

  return redirect("/app/settings");
};

export default function SettingsPage() {
  const { delayValues, profiles, savedMappings } = useLoaderData();

  // Create a state object like { "1w": "gid://...", "2w": "" }
  const initialSelections = Object.fromEntries(
    delayValues.map((delay) => [
      delay,
      savedMappings.find((m) => m.delayValue === delay)?.profileId || "",
    ]),
  );
  const [selections, setSelections] = useState(initialSelections);

  const handleChange = (delayValue) => (newValue) => {
    setSelections((prev) => ({
      ...prev,
      [delayValue]: newValue,
    }));
  };

  const shopify = useAppBridge();

  const showToast = () => {
    shopify.toast.show("Settings saved");
  };

  return (
    <Frame>
      <Page title="Shipping Delay Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <Form method="post">
                <FormLayout>
                  {delayValues.map((value) => (
                    <div key={value}>
                      <Text variant="bodyMd" as="p">
                        <strong>{value}</strong>
                      </Text>
                      <Select
                        name={value}
                        options={[
                          {
                            label: "-- Select a shipping profile --",
                            value: "",
                          },
                          ...profiles.map((profile) => ({
                            label: profile.name,
                            value: profile.id,
                          })),
                        ]}
                        value={selections[value]}
                        onChange={handleChange(value)}
                      />
                    </div>
                  ))}

                  <Button primary submit onClick={showToast}>
                    Save Settings
                  </Button>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
