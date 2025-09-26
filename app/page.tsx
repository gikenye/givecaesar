"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Send, Wallet, Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { createPublicClient, http, isAddress, parseEther, Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const CONTRACT_ADDRESS = "0x3e4f80877172a7c572959fa8fF0075632fe4081a" as Address; 

const contractAbi = [
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldRecipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newRecipient",
        "type": "address"
      }
    ],
    "name": "FeeRecipientChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "walletSet",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "name": "FundsDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "name": "FundsDepositedCustom",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountPerRecipient",
        "type": "uint256"
      }
    ],
    "name": "FundsDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "FundsDistributedCustom",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "customDeposits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalDeposited",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isETH",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "_walletSet",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "depositCustom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "depositCustomETH",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_walletSet",
        "type": "address[]"
      }
    ],
    "name": "depositETH",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "deposits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "reserveBalance",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isETH",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Initialize public client for ENS resolution (often done once outside the component or memoized)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

interface Recipient {
  id: string
  address: string
  ensName?: string
  amount: string
  isValid?: boolean
}

export default function CaesarApp() {
  const [recipients, setRecipients] = useState<Recipient[]>([{ id: "1", address: "", amount: "", isValid: false }])
  const { toast } = useToast()
  const { address, isConnected } = useAccount()
  const { open } = useAppKit()

  const { data: hash, isPending, writeContract } = useWriteContract()

  // Wait for the transaction to be confirmed
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTransactionError } = useWaitForTransactionReceipt({ hash });

  const addRecipient = () => {
    const newId = (recipients.length + 1).toString()
    setRecipients([...recipients, { id: newId, address: "", amount: "", isValid: false }])
  }

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((r) => r.id !== id))
    }
  }

  const updateRecipient = async (id: string, field: "address" | "amount", value: string) => {
    if (field === "address") {
      const isEnsName = value.toLowerCase().endsWith(".eth");
      let resolvedAddress: Address | string = value;
      let ensName: string | undefined = undefined;
      let isValidAddress = false;

      if (isEnsName) {
        try {
          const normalizedName = normalize(value);
          const addr = await publicClient.getEnsAddress({ name: normalizedName });
          if (addr) {
            resolvedAddress = addr;
            ensName = normalizedName;
            isValidAddress = true;
            toast({
              title: "ENS Resolved",
              description: `Resolved ${value} to ${addr.slice(0, 6)}...${addr.slice(-4)}`,
            });
          } else {
            toast({
              title: "ENS Resolution Failed",
              description: `Could not resolve ENS name: ${value}`,
              variant: "destructive",
            });
            isValidAddress = false;
          }
        } catch (error) {
          console.error("ENS resolution error:", error);
          toast({
            title: "ENS Resolution Error",
            description: `Error resolving ${value}: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
          isValidAddress = false;
        }
      } else {
        isValidAddress = isAddress(value);
        if (!isValidAddress && value.trim() !== "") {
          toast({
            title: "Invalid Address",
            description: "Please enter a valid Ethereum address.",
            variant: "destructive",
          });
        }
      }

      setRecipients(recipients.map((r) =>
        r.id === id
          ? {
              ...r,
              address: resolvedAddress as Address,
              ensName: ensName || (isEnsName ? value : undefined),
              isValid: isValidAddress,
            }
          : r
      ));
    } else {
      setRecipients(recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    }
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

    const validRecipients = recipients.filter((r) => r.isValid && r.amount.trim() !== "")
    if (validRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please add valid recipients with addresses and amounts",
        variant: "destructive",
      })
      return
    }

    // Extract resolved addresses and amounts
    const recipientAddresses = validRecipients.map(r => r.address as Address);
    const recipientAmounts = validRecipients.map(r => parseEther(r.amount));

    // Calculate total value to send with the transaction
    const totalAmount = recipientAmounts.reduce((sum, amount) => sum + amount, BigInt(0));

    // Call the smart contract function
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: contractAbi,
      functionName: "depositCustomETH",
      args: [recipientAddresses, recipientAmounts],
      value: totalAmount, // Pass the total ETH value
    });
  }

  const isSending = isPending || isConfirming;
  
  // Conditionally render based on transaction status
  const renderTxStatus = () => {
    if (isPending) {
      return <span className="text-muted-foreground">Confirm in wallet...</span>;
    }
    if (isConfirming) {
      return <div className="flex items-center gap-2 text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for confirmation...</div>;
    }
    if (isConfirmed) {
      return <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-4 w-4" /> Transaction successful!</div>;
    }
    if (isTransactionError) {
      // You can add logic here to parse the error message if needed
      return <div className="flex items-center gap-2 text-destructive">Transaction failed.</div>;
    }
    return null;
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
            {isConnected && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 justify-center text-sm">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="text-green-800">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
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
                  <div key={recipient.id} className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex-1 w-full">
                      <Input
                        placeholder={`Recipient ${index + 1} address or ENS (e.g., vitalik.eth)`}
                        value={recipient.ensName || recipient.address}
                        onChange={(e) => updateRecipient(recipient.id, "address", e.target.value)}
                        className={!recipient.isValid && recipient.address.trim() !== "" ? "border-red-500" : ""}
                      />
                      {recipient.ensName && recipient.isValid && (
                        <p className="text-xs text-muted-foreground mt-1">Resolved: {recipient.address}</p>
                      )}
                    </div>
                    <div className="w-full sm:w-32">
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
                      disabled={recipients.length === 1 || isSending}
                      className="shrink-0"
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
            
            {renderTxStatus()}

            <Button 
              onClick={handleSendPayments} 
              className="w-full gap-2 text-lg py-6" 
              size="lg"
              disabled={isSending || recipients.some(r => !r.isValid || r.amount.trim() === "" || Number.isNaN(Number.parseFloat(r.amount)))}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Payments
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
