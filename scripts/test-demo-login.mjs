const baseUrl = (process.env.BASE_URL || 'https://freshsaver-ai.vercel.app').replace(/\/$/, '')

async function testRole(role, expectedPath) {
  const response = await fetch(`${baseUrl}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ role }),
    redirect: 'manual',
  })

  if (response.status !== 303) {
    throw new Error(`${role}: expected 303 from native form login, received ${response.status}: ${await response.text()}`)
  }

  const location = response.headers.get('location')
  if (!location || new URL(location, baseUrl).pathname !== expectedPath) {
    throw new Error(`${role}: expected redirect to ${expectedPath}, received ${location ?? 'none'}`)
  }

  const setCookies = response.headers.getSetCookie()
  if (setCookies.length === 0) throw new Error(`${role}: authentication response did not set session cookies`)
  const cookieHeader = setCookies.map(cookie => cookie.split(';', 1)[0]).join('; ')
  const destination = await fetch(new URL(location, baseUrl), {
    headers: { Cookie: cookieHeader },
    redirect: 'manual',
  })
  if (destination.status !== 200) {
    throw new Error(`${role}: ${expectedPath} returned ${destination.status} after login`)
  }

  console.log(`${role}: form login 303 -> ${expectedPath} 200`)
}

await testRole('customer', '/account')
await testRole('owner', '/dashboard')
