/**
 * Admin huddle detail page.
 *
 * Re-exports the same detail component used by /huddles/[id].
 * Keeping the route under /admin/huddles/… ensures the sidebar
 * stays on the "Admin Settings → All Huddles" menu item.
 */
export { default } from '@/app/(app)/huddles/[id]/page'
