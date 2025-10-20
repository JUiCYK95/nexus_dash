import axios from 'axios'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Fallback to env vars for development
const DEFAULT_WAHA_API_URL = process.env.WAHA_API_URL || 'http://localhost:3000'
const DEFAULT_WAHA_API_KEY = process.env.WAHA_API_KEY

class WAHAClient {
  private baseURL: string
  private apiKey?: string

  constructor(baseURL?: string, apiKey?: string) {
    // Remove trailing slash to prevent double slashes in URLs
    this.baseURL = (baseURL || DEFAULT_WAHA_API_URL).replace(/\/$/, '')
    this.apiKey = apiKey || DEFAULT_WAHA_API_KEY
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      // WAHA uses X-Api-Key header, not Bearer token
      headers['X-Api-Key'] = this.apiKey
    }

    return headers
  }

  // Static method to create client for a specific organization
  static async forOrganization(organizationId: string): Promise<WAHAClient> {
    const supabase = createServerSupabaseClient()

    // Get organization WAHA configuration
    const { data: org, error } = await supabase
      .from('organizations')
      .select('waha_api_url, waha_api_key, waha_session_name')
      .eq('id', organizationId)
      .single()

    if (error || !org) {
      throw new Error(`Failed to get WAHA configuration for organization: ${error?.message || 'Organization not found'}`)
    }

    if (!org.waha_api_url) {
      throw new Error('WAHA API URL not configured for this organization. Please configure it in Settings.')
    }

    return new WAHAClient(org.waha_api_url, org.waha_api_key)
  }

  // Session Management
  async createSession(sessionName: string, webhookUrl?: string) {
    const config: any = {
      webhooks: webhookUrl ? [{ url: webhookUrl, events: ['message', 'message.any'] }] : []
    }

    const response = await axios.post(
      `${this.baseURL}/api/sessions`,
      { name: sessionName, config },
      { headers: this.getHeaders() }
    )
    
    return response.data
  }

  async getSession(sessionName: string) {
    const response = await axios.get(
      `${this.baseURL}/api/sessions/${sessionName}`,
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async getQRCode(sessionName: string) {
    const headers = this.getHeaders()
    headers['Accept'] = 'application/json' // Request base64 format

    const url = `${this.baseURL}/api/${sessionName}/auth/qr?format=image`

    const response = await axios.get(url, { headers })

    return response.data
  }

  // Chat Management
  async getChats(sessionName: string) {
    const response = await axios.get(
      `${this.baseURL}/api/${sessionName}/chats`,
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async getChatsOverview(sessionName: string, limit = 100) {
    const response = await axios.get(
      `${this.baseURL}/api/${sessionName}/chats/overview`,
      {
        headers: this.getHeaders(),
        params: { limit }
      }
    )

    return response.data
  }

  async deleteChat(sessionName: string, chatId: string) {
    const response = await axios.delete(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}`,
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async getChatMessages(sessionName: string, chatId: string, limit = 100, offset = 0) {
    const response = await axios.get(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/messages`,
      {
        headers: this.getHeaders(),
        params: { limit, offset }
      }
    )

    return response.data
  }

  async clearChatMessages(sessionName: string, chatId: string) {
    const response = await axios.delete(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/messages`,
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async markChatAsRead(sessionName: string, chatId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/messages/read`,
      {},
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async archiveChat(sessionName: string, chatId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/archive`,
      {},
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async unarchiveChat(sessionName: string, chatId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/unarchive`,
      {},
      { headers: this.getHeaders() }
    )

    return response.data
  }

  // Message Management
  async sendTextMessage(sessionName: string, chatId: string, text: string, options?: any) {
    const response = await axios.post(
      `${this.baseURL}/api/sendText`,
      {
        session: sessionName,
        chatId: chatId,
        text: text,
        ...options
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async sendImage(sessionName: string, chatId: string, file: any, caption?: string) {
    const response = await axios.post(
      `${this.baseURL}/api/sendImage`,
      {
        session: sessionName,
        chatId: chatId,
        file: file,
        caption: caption
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async sendFile(sessionName: string, chatId: string, file: any, caption?: string) {
    const response = await axios.post(
      `${this.baseURL}/api/sendFile`,
      {
        session: sessionName,
        chatId: chatId,
        file: file,
        caption: caption
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async sendVoice(sessionName: string, chatId: string, file: any) {
    const response = await axios.post(
      `${this.baseURL}/api/sendVoice`,
      {
        session: sessionName,
        chatId: chatId,
        file: file
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async sendVideo(sessionName: string, chatId: string, file: any, caption?: string) {
    const response = await axios.post(
      `${this.baseURL}/api/sendVideo`,
      {
        session: sessionName,
        chatId: chatId,
        file: file,
        caption: caption
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async sendLocation(sessionName: string, chatId: string, latitude: number, longitude: number, title?: string) {
    const response = await axios.post(
      `${this.baseURL}/api/sendLocation`,
      {
        session: sessionName,
        chatId: chatId,
        latitude: latitude,
        longitude: longitude,
        title: title
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async sendSeen(sessionName: string, chatId: string, messageId?: string) {
    const response = await axios.post(
      `${this.baseURL}/api/sendSeen`,
      {
        session: sessionName,
        chatId: chatId,
        messageId: messageId
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async startTyping(sessionName: string, chatId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/startTyping`,
      {
        session: sessionName,
        chatId: chatId
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async stopTyping(sessionName: string, chatId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/stopTyping`,
      {
        session: sessionName,
        chatId: chatId
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async reactToMessage(sessionName: string, messageId: string, chatId: string, reaction: string) {
    const response = await axios.put(
      `${this.baseURL}/api/reaction`,
      {
        session: sessionName,
        messageId: messageId,
        chatId: chatId,
        reaction: reaction
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async deleteMessage(sessionName: string, chatId: string, messageId: string) {
    const response = await axios.delete(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/messages/${messageId}`,
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async editMessage(sessionName: string, chatId: string, messageId: string, text: string) {
    const response = await axios.put(
      `${this.baseURL}/api/${sessionName}/chats/${chatId}/messages/${messageId}`,
      { text: text },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async forwardMessage(sessionName: string, messageId: string, chatId: string, to: string) {
    const response = await axios.post(
      `${this.baseURL}/api/forwardMessage`,
      {
        session: sessionName,
        messageId: messageId,
        chatId: chatId,
        to: to
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async starMessage(sessionName: string, chatId: string, messageId: string, star: boolean) {
    const response = await axios.put(
      `${this.baseURL}/api/star`,
      {
        session: sessionName,
        chatId: chatId,
        messageId: messageId,
        star: star
      },
      { headers: this.getHeaders() }
    )

    return response.data
  }

  async getMessages(sessionName: string, chatId: string, limit = 100) {
    const response = await axios.get(
      `${this.baseURL}/api/messages`,
      {
        headers: this.getHeaders(),
        params: { session: sessionName, chatId, limit }
      }
    )

    return response.data
  }

  async checkNumberStatus(sessionName: string, phone: string) {
    const response = await axios.get(
      `${this.baseURL}/api/checkNumberStatus`,
      {
        headers: this.getHeaders(),
        params: {
          session: sessionName,
          phone: phone
        }
      }
    )

    return response.data
  }

  // Contact Management
  async getContacts(sessionName: string) {
    const response = await axios.get(`${this.baseURL}/api/contacts/all`, {
      headers: this.getHeaders(),
      params: {
        session: sessionName,
        sortBy: 'name',
        sortOrder: 'asc'
      }
    })

    return response.data
  }

  async getContactInfo(sessionName: string, contactId: string) {
    const response = await axios.get(
      `${this.baseURL}/api/contacts`,
      {
        headers: this.getHeaders(),
        params: {
          session: sessionName,
          contactId: contactId
        }
      }
    )

    return response.data
  }

  async getContactProfilePicture(sessionName: string, contactId: string) {
    const response = await axios.get(
      `${this.baseURL}/api/contacts/profile-picture`,
      {
        headers: this.getHeaders(),
        params: {
          session: sessionName,
          contactId: contactId
        }
      }
    )

    return response.data
  }

  async getContactAbout(sessionName: string, contactId: string) {
    const response = await axios.get(
      `${this.baseURL}/api/contacts/about`,
      {
        headers: this.getHeaders(),
        params: {
          session: sessionName,
          contactId: contactId
        }
      }
    )

    return response.data
  }

  async checkContactExists(sessionName: string, phone: string) {
    const response = await axios.get(
      `${this.baseURL}/api/contacts/check-exists`,
      {
        headers: this.getHeaders(),
        params: {
          session: sessionName,
          phone: phone
        }
      }
    )

    return response.data
  }

  async blockContact(sessionName: string, contactId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/contacts/block`,
      { contactId },
      {
        headers: this.getHeaders(),
        params: { session: sessionName }
      }
    )

    return response.data
  }

  async unblockContact(sessionName: string, contactId: string) {
    const response = await axios.post(
      `${this.baseURL}/api/contacts/unblock`,
      { contactId },
      {
        headers: this.getHeaders(),
        params: { session: sessionName }
      }
    )

    return response.data
  }

  async updateContact(sessionName: string, chatId: string, contactData: any) {
    const response = await axios.put(
      `${this.baseURL}/api/${sessionName}/contacts/${chatId}`,
      contactData,
      { headers: this.getHeaders() }
    )

    return response.data
  }
}

// Default client for backward compatibility (uses env vars)
export const wahaClient = new WAHAClient()

// Export class for multi-tenant usage
export { WAHAClient }
export default WAHAClient