import { redirect } from 'next/navigation'
import { getControlUser } from '@/lib/control/auth'
import ControlShell from './ControlShell'

export const metadata = { title: { default: 'Control Center', template: '%s | OwnCampus Control' } }

export default async function ControlLayout({ children }) {
  const cu = await getControlUser()
  if (!cu) redirect('/control/login')

  return <ControlShell user={cu}>{children}</ControlShell>
}
