'use client'

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
  required?: boolean
}

interface SelectOptionProps {
  value: string
  children: React.ReactNode
}

const SelectContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  value: '',
  onChange: () => {},
  isOpen: false,
  setIsOpen: () => {}
})

export function Select({ value, onChange, children, className }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const selectRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <SelectContext value={{ value, onChange, isOpen, setIsOpen }}>
      <div ref={selectRef} className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext>
  )
}

export function SelectTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  const { value, isOpen, setIsOpen } = React.useContext(SelectContext)
  
  return (
    <button
      type="button"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:text-foreground justify-between items-center",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      <span className={value ? "text-foreground" : "text-muted-foreground"}>
        {children}
      </span>
      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
    </button>
  )
}

export function SelectContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen } = React.useContext(SelectContext)
  
  if (!isOpen) return null
  
  return (
    <div
      className={cn(
        "absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectValue({ placeholder, ...props }: { placeholder?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const { value } = React.useContext(SelectContext)
  
  return (
    <span {...props}>
      {value || placeholder}
    </span>
  )
}

export function SelectItem({ value, children, ...props }: SelectOptionProps & React.HTMLAttributes<HTMLDivElement>) {
  const { value: selectedValue, onChange, setIsOpen } = React.useContext(SelectContext)
  const isSelected = value === selectedValue
  
  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-pointer transition-colors",
        isSelected 
          ? "bg-accent text-accent-foreground" 
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      onClick={() => {
        onChange(value)
        setIsOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectOption({ value, children, ...props }: SelectOptionProps & React.HTMLAttributes<HTMLDivElement>) {
  const { value: selectedValue, onChange, setIsOpen } = React.useContext(SelectContext)
  const isSelected = value === selectedValue
  
  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-pointer transition-colors",
        isSelected 
          ? "bg-accent text-accent-foreground" 
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      onClick={() => {
        onChange(value)
        setIsOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}
