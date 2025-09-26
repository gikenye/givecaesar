"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Send, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAccount, useConnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'

interface Recipient {
  id: string
  address: string
  amount: string
}

export default function CaesarApp() {
  const [recipients, setRecipients] = useState<Recipient[]>([{ id: "1", address: "", amount: "" }])
  const { toast } = useToast()
  const { address, isConnected } = useAccount()
  const { open } = useAppKit()

  const addRecipient = () => {
    const newId = (recipients.length + 1).toString()
    setRecipients([...recipients, { id: newId, address: "", amount: "" }])
  }

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((r) => r.id !== id))
    }
  }

  const updateRecipient = (id: string, field: "address" | "amount", value: string) => {
    setRecipients(recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const calculateTotal = () => {
    return recipients.reduce((sum, r) => sum + (Number.parseFloat(r.amount) || 0), 0)
  }

  const handleSendPayments = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      open()
      return
    }

    const validRecipients = recipients.filter((r) => r.address.trim() !== "" && r.amount.trim() !== "")
    if (validRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please add recipients with addresses and amounts",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Payment Initiated",
      description: `Sending payments to ${validRecipients.length} recipients`,
    })

    console.log("Payment details:", {
      from: address,
      recipients: validRecipients,
      totalAmount: calculateTotal(),
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-balance">Caesar</h1>
          <p className="text-2xl text-primary font-medium mb-4 text-balance">"Give to Caesar what belongs to Caesar"</p>
          <p className="text-lg text-muted-foreground text-pretty">
            Send crypto payments to multiple wallets in a single transaction
          </p>
          <div className="mt-8 space-y-4">
            <appkit-button />
            {isConnected && address && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 justify-center text-sm">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Batch Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Recipients</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRecipient}
                  className="gap-2 bg-transparent"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {recipients.map((recipient, index) => (
                  <div key={recipient.id} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder={`Recipient ${index + 1} address`}
                        value={recipient.address}
                        onChange={(e) => updateRecipient(recipient.id, "address", e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="Amount"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(recipient.id, "amount", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRecipient(recipient.id)}
                      disabled={recipients.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {calculateTotal() > 0 && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{calculateTotal().toFixed(4)} ETH</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
            )}

            <Button onClick={handleSendPayments} className="w-full gap-2 text-lg py-6" size="lg">
              <Send className="w-5 h-5" />
              Send Payments
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
