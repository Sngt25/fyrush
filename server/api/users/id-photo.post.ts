import { eq } from 'drizzle-orm'
import { blob } from 'hub:blob'
import { db, schema } from 'hub:db'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const [file] = await blob.handleUpload(event, {
    formKey: 'file',
    multiple: false,
    ensure: {
      maxSize: '4MB',
      types: ['image/png', 'image/jpeg', 'image/webp']
    },
    put: {
      prefix: `ids/${user.id}`,
      addRandomSuffix: true,
      access: 'private'
    }
  })

  if (!file?.pathname) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No ID photo uploaded.'
    })
  }

  if (user.idPhotoPathname && user.idPhotoPathname !== file.pathname)
    await blob.del(user.idPhotoPathname).catch(() => {})

  await db
    .update(schema.users)
    .set({ idPhotoPathname: file.pathname })
    .where(eq(schema.users.id, user.id))

  return {
    ok: true,
    pathname: file.pathname
  }
})
