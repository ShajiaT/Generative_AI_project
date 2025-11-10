// src/services/supabaseService.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

class SupabaseService {
  constructor() {
    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Environment check:')
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables. Please check your .env file.')
    }

    // Initialize clients
    this.client = createClient(supabaseUrl, supabaseAnonKey)

    this.adminClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.client.from('profiles').select('count').limit(1)
      if (error) throw error
      console.log('✅ Supabase connection successful')
      return true
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
  }

  // Auth operations
  async createUser(email, password) {
    try {
      const { data, error } = await this.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      return { user: null, error }
    }
  }

  async signInUser(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Database operations
  async createProfile(userData) {
    try {
      const { data, error } = await this.adminClient
        .from('profiles')
        .insert([userData])
        .select()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getProfile(userId) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get client instances (for advanced operations)
  getClient() {
    return this.client
  }

  getAdminClient() {
    return this.adminClient
  }
}

// Create and export a singleton instance
const supabaseService = new SupabaseService()

// Test connection on startup
supabaseService.testConnection()

export default supabaseService

// Export individual clients for backward compatibility
export const supabase = supabaseService.getClient()
export const supabaseAdmin = supabaseService.getAdminClient()
