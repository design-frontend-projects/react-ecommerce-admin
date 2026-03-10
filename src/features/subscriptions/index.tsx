import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ConfigDrawer } from '@/components/config-drawer';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { SubscriptionAssignment } from './components/subscription-assignment';
import { TenantSubscriptionList } from './components/tenant-subscription-list';

export function SubscriptionsFeature() {
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Subscriptions Management</h2>
            <p className='text-muted-foreground'>
              Assign and manage tenant subscription plans.
            </p>
          </div>
          <SubscriptionAssignment />
        </div>
        
        <TenantSubscriptionList />
      </Main>
    </>
  );
}
