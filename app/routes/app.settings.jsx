import {
  Page,
  Layout,
  Card,
  Select,
  Text,
  Button,
  FormLayout,
  Frame,
  Toast,
  useToast,
} from "@shopify/polaris";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useSearchParams } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const saved = url.searchParams.get("saved") === "1";

  const { admin } = await authenticate.admin(request);

  // For now, hardcoded
  const delayValues = ["1w", "2w", "1m", "2d"];

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

  return json({ delayValues, profiles, savedMappings, saved });
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

  return redirect("/app/settings?saved=1");
};

export default function SettingsPage() {
  const { delayValues, profiles, savedMappings, saved } = useLoaderData();
  const [toastActive, setToastActive] = useState(saved);

  const toggleToastActive = () => setToastActive(false);
  const toastMarkup = toastActive ? (
    <Toast content="Settings saved" onDismiss={toggleToastActive} />
  ) : null;

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

                  <Button primary submit>
                    Save Settings
                  </Button>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
        {toastMarkup}
      </Page>
    </Frame>
  );
}
