import { Temporal, toPlainDate } from '@/lib/temporal_utils'
import prisma from '@/lib/prisma'

export async function scheduleTask(
  customerId: number,
  title: string,
  dueDate: Date
) {
  const today = Temporal.Now.plainDateISO()
  const duePlain = toPlainDate(dueDate)
  if (Temporal.PlainDate.compare(duePlain, today) < 0) {
    throw new Error('Cannot schedule tasks in the past')
  }

  return await prisma.crm_tasks.create({
    data: {
      customer_id: customerId,
      title,
      due_date: dueDate,
      status: 'pending',
    },
  })
}

export async function completeTask(taskId: number) {
  return await prisma.crm_tasks.update({
    where: { id: taskId },
    data: { status: 'completed' },
  })
}

export async function logInteraction(
  customerId: number,
  type: string,
  notes: string
) {
  return await prisma.crm_interactions.create({
    data: {
      customer_id: customerId,
      type,
      notes,
    },
  })
}
