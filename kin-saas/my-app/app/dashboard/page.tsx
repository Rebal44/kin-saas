"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  MessageCircle,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QRCodeDisplay } from "@/components/qr-code"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  subscription_status: string | null
}

interface Connection {
  id: string
  type: "whatsapp" | "telegram"
  status: "pending" | "connected" | "disconnected"
  phone_number: string | null
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [whatsappQR, setWhatsappQR] = useState("")

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/sign-in")
        return
      }

      setUser({
        id: user.id,
        email: user.email || "",
        subscription_status: null,
      })

      // Generate WhatsApp QR code
      setWhatsappQR(`https://wa.me/1234567890?text=CONNECT:${user.id}`)

      // Fetch connections
      fetchConnections(user.id)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/auth/sign-in")
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async (userId: string) => {
    // Mock data for now
    setConnections([
      {
        id: "1",
        type: "whatsapp",
        status: "pending",
        phone_number: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        type: "telegram",
        status: "disconnected",
        phone_number: null,
        created_at: new Date().toISOString(),
      },
    ])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSubscribe = async () => {
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error("Error creating checkout:", error)
    }
  }

  const getTelegramLink = () => {
    return `https://t.me/KinAssistantBot?start=${user?.id}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold">Kin</span>
            </Link>

            <div className="flex items-center gap-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Manage your connections and settings</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Subscription</CardTitle>
                      <CardDescription>Manage your plan</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.subscription_status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="h-4 w-4" />
                        Trial
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {user?.subscription_status !== "active" ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Kin Pro</p>
                      <p className="text-sm text-muted-foreground">$29/month - Full access</p>
                    </div>
                    <Button onClick={handleSubscribe}>Subscribe</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">You're subscribed to Kin Pro</p>
                    <Button variant="outline" onClick={handleSubscribe}>Manage</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connections */}
            <Card>
              <CardHeader>
                <CardTitle>Your Connections</CardTitle>
                <CardDescription>Connect Kin to your messaging apps</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="whatsapp" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                    <TabsTrigger value="telegram">Telegram</TabsTrigger>
                  </TabsList>

                  <TabsContent value="whatsapp" className="mt-6">
                    {connections.find((c) => c.type === "whatsapp")?.status === "connected" ? (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="font-medium">Connected</p>
                          <p className="text-sm text-muted-foreground">
                            {connections.find((c) => c.type === "whatsapp")?.phone_number}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Scan this QR code with WhatsApp to connect
                        </p>
                        <div className="flex justify-center">
                          <QRCodeDisplay
                            value={whatsappQR}
                            description="Open WhatsApp → Settings → Linked Devices → Link a Device"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="telegram" className="mt-6">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Click the button below to connect with our Telegram bot
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => window.open(getTelegramLink(), "_blank")}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Open Telegram Bot
                      </Button>
                      
                      {connections.find((c) => c.type === "telegram")?.status === "connected" && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Connected</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Messages</span>
                  <span className="font-medium">0</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Connections</span>
                  <span className="font-medium">
                    {connections.filter((c) => c.status === "connected").length}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-between" asChild>
                  <Link href="#">
                    Documentation
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-between" asChild>
                  <Link href="#">
                    Support
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
