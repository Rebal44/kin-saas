"use client"

import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QRCodeProps {
  value: string
  title?: string
  description?: string
}

export function QRCodeDisplay({ value, title, description }: QRCodeProps) {
  return (
    <Card className="w-fit">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-lg bg-white p-4">
          <QRCodeSVG
            value={value}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin={false}
          />
        </div>
        {description && (
          <p className="text-center text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
