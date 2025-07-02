import { json, redirect } from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';

export const loader = async ({ request }) => {
  const { admin, shop } = await authenticate.admin(request);

  // 1. Get all unique shipping_delay values from variants
  const delayValues = ['1w', '2w', '1m', '2d'];

  // 2. Get all shipping profiles
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

  console.log(profilesResp.json());

  const profiles = profilesResp.body.data.deliveryProfiles.nodes;

  // 3. Get saved mappings from Prisma
  const saved = await prisma.shippingDelayProfile.findMany({
    where: { shop },
  });

  return json({ delayValues, profiles, saved });
};

export const action = async ({ request }) => {
  const { shop } = await authenticate.admin(request);
  const formData = await request.formData();

  const entries = [...formData.entries()];
  for (const [key, profileId] of entries) {
    const delayValue = key;

    if (typeof profileId === 'string' && profileId) {
      await prisma.shippingDelayProfile.upsert({
        where: {
          shop_delayValue: {
            shop,
            delayValue,
          },
        },
        update: { profileId },
        create: {
          shop,
          delayValue,
          profileId,
        },
      });
    }
  }

  return redirect('/app/settings');
};

export default function SettingsPage() {
  const { delayValues, profiles, saved } = useLoaderData();

  const savedMap = Object.fromEntries(
    saved.map((s) => [s.delayValue, s.profileId])
  );

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Shipping Delay Settings</h1>
      <Form method="post" className="space-y-4">
        {delayValues.map((value) => (
          <div key={value} className="flex items-center gap-4">
            <label className="w-48 font-medium">{value}</label>
            <select
              name={value}
              defaultValue={savedMap[value] || ''}
              className="border border-gray-300 p-2 rounded w-full"
            >
              <option value="">-- Select a shipping profile --</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          type="submit"
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </Form>
    </div>
  );
}
