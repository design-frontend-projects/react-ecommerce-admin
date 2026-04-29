export function jsonError(message: string, status = 400) {
  return Response.json(
    {
      success: false,
      message,
      error: {
        message,
      },
    },
    { status }
  )
}
