import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const activityTypes = [
    { code: 'USER_LOGIN', name: 'User Login', description: 'User successfully logged in' },
    { code: 'USER_LOGOUT', name: 'User Logout', description: 'User successfully logged out' },
    { code: 'ITEM_CREATED', name: 'Item Created', description: 'A new item was created' },
    { code: 'ITEM_UPDATED', name: 'Item Updated', description: 'An item was updated' },
    { code: 'ITEM_DELETED', name: 'Item Deleted', description: 'An item was deleted' },
    { code: 'SETTINGS_UPDATED', name: 'Settings Updated', description: 'System settings were updated' },
  ];

  console.log('Start seeding activity types...');
  for (const activityType of activityTypes) {
    const act = await prisma.activity_types.upsert({
      where: { code: activityType.code },
      update: {},
      create: activityType,
    });
    console.log(`Upserted activity type with id: ${act.id}`);
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
