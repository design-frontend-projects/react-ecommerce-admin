import { faker } from '@faker-js/faker'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USERS_OUTPUT = path.resolve(__dirname, '../src/features/users/data/users.json')
const TASKS_OUTPUT = path.resolve(__dirname, '../src/features/tasks/data/tasks.json')

function generateUsers() {
  console.log('Generating users...')
  faker.seed(67890)
  const users = Array.from({ length: 500 }, () => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    return {
      id: faker.string.uuid(),
      firstName,
      lastName,
      username: faker.internet
        .username({ firstName, lastName })
        .toLocaleLowerCase(),
      email: faker.internet.email({ firstName }).toLocaleLowerCase(),
      phoneNumber: faker.phone.number({ style: 'international' }),
      status: faker.helpers.arrayElement([
        'active',
        'inactive',
        'invited',
        'suspended',
      ]),
      role: faker.helpers.arrayElement([
        'super_admin',
        'admin',
        'cashier',
        'manager',
      ]),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    }
  })

  fs.writeFileSync(USERS_OUTPUT, JSON.stringify(users, null, 2))
  console.log(`Generated ${users.length} users to ${USERS_OUTPUT}`)
}

function generateTasks() {
  console.log('Generating tasks...')
  faker.seed(12345)
  const tasks = Array.from({ length: 100 }, () => {
    const statuses = [
      'todo',
      'in progress',
      'done',
      'canceled',
      'backlog',
    ] as const
    const labels = ['bug', 'feature', 'documentation'] as const
    const priorities = ['low', 'medium', 'high'] as const

    return {
      id: `TASK-${faker.number.int({ min: 1000, max: 9999 })}`,
      title: faker.lorem.sentence({ min: 5, max: 15 }),
      status: faker.helpers.arrayElement(statuses),
      label: faker.helpers.arrayElement(labels),
      priority: faker.helpers.arrayElement(priorities),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      assignee: faker.person.fullName(),
      description: faker.lorem.paragraph({ min: 1, max: 3 }),
      dueDate: faker.date.future(),
    }
  })

  fs.writeFileSync(TASKS_OUTPUT, JSON.stringify(tasks, null, 2))
  console.log(`Generated ${tasks.length} tasks to ${TASKS_OUTPUT}`)
}

generateUsers()
generateTasks()
