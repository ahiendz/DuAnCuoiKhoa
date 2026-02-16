# UI COMPONENT – TABS (ROLE LOGIN)

Dependency:
npx shadcn@latest add @animate-ui/components-base-tabs

Files:
- src/components/ui/Tabs.jsx
- src/components/auth/LoginTabs.jsx

Usage:
- Trang Login
- Trang cài đặt người dùng

Yêu cầu:
- Smooth transition
- Auto-height mode
- Không reload page
- Accessible

Tabs


A component for toggling between related panels on the same page.

Made by imskyleen
Edit on GitHub
Copy Markdown
Open
Preview
Code
demo-components-base-tabs.tsx

import {
  Tabs,
  TabsPanel,
  TabsPanels,
  TabsList,
  TabsTab,
} from '@/components/animate-ui/components/base/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BaseTabsDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTab value="account">Account</TabsTab>
          <TabsTab value="password">Password</TabsTab>
        </TabsList>
        <Card className="shadow-none py-0">
          <TabsPanels className="py-6">
            <TabsPanel value="account" className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Make changes to your account here. Click save when you&apos;re
                  done.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-name">Name</Label>
                  <Input id="tabs-demo-name" defaultValue="Pedro Duarte" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save changes</Button>
              </CardFooter>
            </TabsPanel>
            <TabsPanel value="password" className="flex flex-col gap-6">
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password here. After saving, you&apos;ll be logged
                  out.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-current">Current password</Label>
                  <Input id="tabs-demo-current" type="password" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-new">New password</Label>
                  <Input id="tabs-demo-new" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save password</Button>
              </CardFooter>
            </TabsPanel>
          </TabsPanels>
        </Card>
      </Tabs>
    </div>
  );
}
Installation
CLI
Manual
npm
pnpm
yarn
bun

npx shadcn@latest add @animate-ui/components-base-tabs
Usage

<Tabs>
  <TabsList>
    <TabsTab value="account">Account</TabsTab>
    <TabsTab value="password">Password</TabsTab>
  </TabsList>
  <TabsPanels>
    <TabsPanel value="account">Make changes to your account here.</TabsPanel>
    <TabsPanel value="password">Change your password here.</TabsPanel>
  </TabsPanels>
</Tabs>
API Reference
Tabs
Animate UI API Reference - Tabs Primitive
Base UI API Reference - Tabs.Root
TabsList
Animate UI API Reference - TabsList Primitive
Base UI API Reference - Tabs.List
TabsTab
Animate UI API Reference - TabsTab Primitive
Base UI API Reference - Tabs.Tab
TabsPanels
Animate UI API Reference - TabsPanels Primitive
Animate UI API Reference - AutoHeight
Prop	Type	Default
mode?

"auto-height" | "layout"
"auto-height"
transition?

Transition
{ type: "spring", stiffness: 200, damping: 25 }
TabsPanel
Animate UI API Reference - TabsPanel Primitive
Base UI API Reference - Tabs.Panel
Prop	Type	Default
transition?

Transition
{ duration: 0.5, ease: "easeInOut" }
...props?

HTMLMotionProps<"div">
-
Credits
Base UI Tabs
Credit to shadcn/ui for style inspiration.