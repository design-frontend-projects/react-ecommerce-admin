import prisma from '../src/lib/prisma'
import { resolveTenantId } from '../src/server/utils/tenant'
import { listSuppliers } from '../src/server/fns/suppliers'

async function main() {
  try {
    const users = await prisma.tenant_users.findMany({ take: 5 })
    console.log('Found users:', users.map((u) => ({ id: u.id, auth_user_id: u.auth_user_id, tenant_id: u.tenant_id })))

    for (const u of users) {
      if (u.auth_user_id) {
        console.log(`Testing for auth_user_id: ${u.auth_user_id}`)
        const tid = await resolveTenantId(u.auth_user_id)
        console.log(`Resolved tenantId: ${tid}`)
        try {
          const list = await listSuppliers(u.auth_user_id)
          console.log(`listSuppliers success, count = ${list.length}`)
        } catch (err: any) {
          console.error(`listSuppliers FAILED for ${u.auth_user_id}:`, err)
        }
      }
    }
  } catch (err) {
    console.error('Error in main:', err)
  }
}

main().then(() => process.exit(0))
