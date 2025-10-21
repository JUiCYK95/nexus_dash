'use client'

import { useState, useEffect, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, CheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  slug: string
  subscription_plan: string
  role: string
}

export default function OrganizationSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current organization from localStorage
      const savedOrgId = localStorage.getItem('current_organization_id')
      setCurrentOrgId(savedOrgId)

      // Fetch user's organizations
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations(
            id,
            name,
            slug,
            subscription_plan
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      const orgs = memberships?.map((m: any) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        subscription_plan: m.organization.subscription_plan,
        role: m.role
      })) || []

      setOrganizations(orgs)
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = async (orgId: string) => {
    try {
      // Save to localStorage
      localStorage.setItem('current_organization_id', orgId)
      setCurrentOrgId(orgId)

      toast.success('Organisation gewechselt')

      // Reload the page to refresh all data
      window.location.reload()
    } catch (error) {
      console.error('Error switching organization:', error)
      toast.error('Fehler beim Wechseln der Organisation')
    }
  }

  const currentOrg = organizations.find(org => org.id === currentOrgId)

  if (loading || organizations.length === 0) {
    return null
  }

  // Don't show switcher if user only has one organization
  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
        <span className="font-medium">{organizations[0].name}</span>
      </div>
    )
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center justify-between w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
          <div className="flex items-center gap-2 min-w-0">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{currentOrg?.name || 'Organisation wählen'}</span>
          </div>
          <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400 flex-shrink-0" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 z-10 mt-2 w-72 origin-top-left rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Deine Organisationen ({organizations.length})
            </div>
            {organizations.map((org) => (
              <Menu.Item key={org.id}>
                {({ active }) => (
                  <button
                    onClick={() => switchOrganization(org.id)}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } group flex w-full items-center justify-between px-4 py-2 text-sm ${
                      org.id === currentOrgId
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="font-medium truncate">{org.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {org.role === 'owner' ? 'Eigentümer' :
                           org.role === 'admin' ? 'Administrator' :
                           'Mitglied'} · {org.subscription_plan}
                        </div>
                      </div>
                    </div>
                    {org.id === currentOrgId && (
                      <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
