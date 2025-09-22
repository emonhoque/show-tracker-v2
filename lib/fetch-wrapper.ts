// Simple fetch wrapper to handle ERR_CONTENT_DECODING_FAILED errors
export async function safeFetch(url: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response
  } catch (error) {
    // If it's a content decoding error, try again without compression
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('Fetch failed, retrying without compression headers...')
      
      const retryOptions: RequestInit = {
        ...defaultOptions,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        }
      }
      
      const retryResponse = await fetch(url, retryOptions)
      
      if (!retryResponse.ok) {
        throw new Error(`HTTP error! status: ${retryResponse.status}`)
      }
      
      return retryResponse
    }
    
    throw error
  }
}
