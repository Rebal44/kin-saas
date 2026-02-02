import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { DashboardNav } from "@/components/dashboard-nav";
import { MessageSquare, CreditCard, BarChart3 } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <>
      <DashboardNav user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Welcome back, {user?.firstName || "there"}!</h1>
          <p className="text-gray-600 mt-1">Manage your Kin assistant and connections</p>
        </div>

        <Tabs defaultValue="connect" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="connect" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Connect
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Subscription
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-500" /> WhatsApp
                    </CardTitle>
                    <Badge variant="secondary">Not Connected</Badge>
                  </div>
                  <CardDescription>
                    Scan this QR code with WhatsApp to connect your Kin assistant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QRCodeDisplay type="whatsapp" userId={userId} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" /> Telegram
                    </CardTitle>
                    <Badge variant="secondary">Not Connected</Badge>
                  </div>
                  <CardDescription>
                    Scan this QR code with Telegram to connect your Kin assistant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QRCodeDisplay type="telegram" userId={userId} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>How to Connect</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Scan the QR code above with your phone</li>
                  <li>Open WhatsApp or Telegram and scan from within the app</li>
                  <li>Start chatting with Kin - send any message to begin!</li>
                  <li>Your connection status will update automatically</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Subscription</CardTitle>
                  <Badge>Active Trial</Badge>
                </div>
                <CardDescription>Manage your Kin subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Kin Pro Plan</p>
                    <p className="text-sm text-gray-600">$29/month, billed monthly</p>
                  </div>
                  <p className="text-2xl font-bold">$29<span className="text-sm font-normal text-gray-600">/mo</span></p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Your trial ends in 12 days. Add a payment method to continue using Kin.</p>
                  <div className="flex gap-3">
                    <Button className="bg-black text-white hover:bg-gray-800">
                      Add Payment Method
                    </Button>
                    <Button variant="outline">
                      Manage Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Messages</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Messages sent to Kin</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Tasks Completed</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Actions taken by Kin</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Days Active</CardDescription>
                  <CardTitle className="text-3xl">1</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Since you joined</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
