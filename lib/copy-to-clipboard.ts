/**
 * Utility function to copy text to clipboard with multiple fallback methods
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  console.log('Copying to clipboard:', text)
  
  if (!text || text.trim() === '') {
    console.error('No text provided to copy')
    return false
  }

  // Method 1: Modern Clipboard API (preferred)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      console.log('Using modern clipboard API')
      await navigator.clipboard.writeText(text)
      console.log('Successfully copied to clipboard using modern API')
      return true
    } catch (error) {
      console.warn('Modern clipboard API failed:', error)
    }
  }

  // Method 2: Fallback using textarea (works in most browsers)
  try {
    console.log('Using textarea fallback method')
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    textArea.style.pointerEvents = 'none'
    textArea.setAttribute('readonly', '')
    
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange(0, text.length)
    
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    console.log('Textarea fallback result:', success)
    return success
  } catch (error) {
    console.warn('Textarea fallback failed:', error)
  }

  // Method 3: Alternative fallback
  try {
    console.log('Using alternative fallback method')
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    console.log('Alternative fallback result:', success)
    return success
  } catch (error) {
    console.error('All copy methods failed:', error)
    return false
  }
}

/**
 * Copy text to clipboard with user feedback
 */
export async function copyWithFeedback(
  text: string, 
  onSuccess?: () => void, 
  onError?: (error: string) => void
): Promise<boolean> {
  const success = await copyToClipboard(text)
  
  if (success) {
    onSuccess?.()
  } else {
    onError?.('Failed to copy to clipboard. Please try manually selecting and copying the text.')
  }
  
  return success
}
