import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface CopyFieldProps {
  value: string
  masked?: boolean
  truncate?: number
}

export default function CopyField({ value, masked, truncate }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    console.info("Copied to clipboard")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  let displayValue = value
  if (masked && value.length > 4) {
    if (value.startsWith("qc-")) {
      displayValue = `qc-••••••••${value.slice(-4)}`
    } else {
      displayValue = `${value.slice(0, 3)}***${value.slice(-4)}`
    }
  } else if (truncate && value.length > truncate) {
    displayValue = `${value.slice(0, truncate)}...`
  }

  return (
    <div
      className="inline-flex items-center gap-2 group cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1 transition-colors"
      onClick={handleCopy}
      title={masked ? "Click to copy full key" : value}
    >
      <span className="font-mono text-sm">{displayValue}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-success" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  )
}
