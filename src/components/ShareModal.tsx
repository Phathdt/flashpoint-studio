import { useState } from 'react'
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl: string
  privateBinUrl?: string
}

export function ShareModal({ open, onOpenChange, shareUrl, privateBinUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [copiedPrivateBin, setCopiedPrivateBin] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleCopyPrivateBin = async () => {
    if (!privateBinUrl) return
    try {
      await navigator.clipboard.writeText(privateBinUrl)
      setCopiedPrivateBin(true)
      setTimeout(() => setCopiedPrivateBin(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Transaction
          </DialogTitle>
          <DialogDescription>
            Share this link to allow others to view and simulate this transaction configuration
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="share-url">Share Link (with auto-fill)</Label>
            <div className="flex gap-2">
              <Input id="share-url" value={shareUrl} readOnly className="font-mono text-sm" />
              <Button onClick={handleCopy} variant="outline" size="icon" className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link to auto-fill the transaction form
            </p>
          </div>

          {privateBinUrl && (
            <div className="space-y-2">
              <Label htmlFor="privatebin-url">PrivateBin Direct Link</Label>
              <div className="flex gap-2">
                <Input
                  id="privatebin-url"
                  value={privateBinUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleCopyPrivateBin}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  {copiedPrivateBin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => window.open(privateBinUrl, '_blank')}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                View the encrypted data directly on PrivateBin
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Data is end-to-end encrypted and stored securely for 7 days
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
